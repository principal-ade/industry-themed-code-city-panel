import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  MapIcon,
  Building2,
  List,
  ChevronDown,
} from 'lucide-react';
import { Legend, LegendFileType, LegendGitStatus, LegendAgentLayer, LegendQualityMetric } from './components/Legend';
import { useTheme } from '@principal-ade/industry-theme';
import {
  ArchitectureMapHighlightLayers,
  type CityData,
  type CityBuilding,
  type CityDistrict,
  type LayerItem,
  createFileColorHighlightLayers,
} from '@principal-ai/code-city-react';
import {
  CodeCityBuilderWithGrid,
  buildFileSystemTreeFromFileInfoList,
} from '@principal-ai/code-city-builder';
import type { FileTree } from '@principal-ai/repository-abstraction';
import type { PanelComponentProps } from '../types';
import {
  type ColorMode,
  type QualitySliceData,
  COLOR_MODES,
  isColorModeAvailable,
  getLayersForColorMode,
  SCORE_THRESHOLDS,
} from './utils/qualityLayers';

/**
 * Git status data - categorized file paths
 */
export interface GitStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
  deleted: string[];
}

/** Git status category colors */
const GIT_STATUS_COLORS = {
  staged: '#22c55e',    // Green
  unstaged: '#f59e0b',  // Yellow/amber
  untracked: '#6b7280', // Gray
  deleted: '#ef4444',   // Red
} as const;

interface HoverInfo {
  hoveredDistrict: CityDistrict | null;
  hoveredBuilding: CityBuilding | null;
  fileTooltip: { text: string } | null;
  directoryTooltip: { text: string } | null;
  fileCount: number | null;
}

interface HighlightLayer {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  priority: number;
  items: LayerItem[];
}

/**
 * CodeCityPanelContent - Internal component that uses theme
 */
const CodeCityPanelContent: React.FC<PanelComponentProps> = ({
  context,
  actions,
}) => {
  const { theme } = useTheme();
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [highlightLayers, setHighlightLayers] = useState<HighlightLayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('fileTypes');
  const [showColorModeDropdown, setShowColorModeDropdown] = useState(false);
  const colorModeDropdownRef = useRef<HTMLDivElement>(null);

  // Measure the content container to compute layout
  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute layout: map gets minimum square size, legend fills remaining space
  const layout = useMemo(() => {
    if (!containerSize) {
      return { minMapSize: 0, legendPosition: 'bottom' as const, legendMaxSize: 0 };
    }

    const { width, height } = containerSize;
    const isLandscape = width > height;

    if (isLandscape) {
      // Landscape: legend on right, map min-width is the height (square)
      const minMapSize = height;
      const legendMaxSize = width - minMapSize;
      return { minMapSize, legendPosition: 'right' as const, legendMaxSize };
    } else {
      // Portrait: legend below, map min-height is the width (square)
      const minMapSize = width;
      const legendMaxSize = height - minMapSize;
      return { minMapSize, legendPosition: 'bottom' as const, legendMaxSize };
    }
  }, [containerSize]);

  // Get file tree slice for generating city data
  // Uses FileTree format from @principal-ai/repository-abstraction
  const fileTreeSlice = context.getSlice<FileTree>('fileTree');

  // Get git status slice for highlighting changed files
  const gitSlice = context.getSlice<GitStatus>('git');

  // Get agent highlight layers slice for showing agent activity
  const agentHighlightLayersSlice = context.getSlice<HighlightLayer[]>('agentHighlightLayers');

  // Get quality slice for coverage and metrics visualization
  const qualitySlice = context.getSlice<QualitySliceData>('quality');

  // Track whether file color layers are currently registered
  const fileColorLayersRegistered = useRef(false);
  const gitLayersRegistered = useRef(false);
  const agentLayersRegistered = useRef(false);
  const lastHasGitOrAgentLayers = useRef<boolean | null>(null);

  // Reset all layer state when repository changes
  const currentRepoPath = context.currentScope.repository?.path;
  const lastRepoPath = useRef<string | undefined>(currentRepoPath);

  useEffect(() => {
    if (lastRepoPath.current !== currentRepoPath) {
      // Repository changed - reset all layer tracking state
      setHighlightLayers([]);
      fileColorLayersRegistered.current = false;
      gitLayersRegistered.current = false;
      agentLayersRegistered.current = false;
      lastHasGitOrAgentLayers.current = null;
      lastRepoPath.current = currentRepoPath;
      setColorMode('fileTypes'); // Reset to default color mode
    }
  }, [currentRepoPath]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorModeDropdownRef.current && !colorModeDropdownRef.current.contains(event.target as Node)) {
        setShowColorModeDropdown(false);
      }
    };

    if (showColorModeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorModeDropdown]);

  // Compute available color modes based on data
  const availableColorModes = useMemo(() => {
    const hasGitData = gitSlice?.data && (
      gitSlice.data.staged.length > 0 ||
      gitSlice.data.unstaged.length > 0 ||
      gitSlice.data.untracked.length > 0 ||
      gitSlice.data.deleted.length > 0
    );

    return COLOR_MODES.filter(mode =>
      isColorModeAvailable(mode.id, qualitySlice?.data, !!hasGitData)
    );
  }, [gitSlice?.data, qualitySlice?.data]);

  // Get current color mode config
  const currentColorModeConfig = useMemo(() => {
    return COLOR_MODES.find(m => m.id === colorMode) || COLOR_MODES[0];
  }, [colorMode]);

  // Get metric value for hovered file (used in hover bar)
  const hoveredFileMetric = useMemo(() => {
    if (!hoverInfo?.hoveredBuilding?.path) return null;
    const filePath = hoverInfo.hoveredBuilding.path;
    const qualityData = qualitySlice?.data;

    if (!qualityData) return null;

    switch (colorMode) {
      case 'coverage': {
        const coverage = qualityData.fileCoverage?.[filePath];
        if (coverage !== undefined) {
          return { type: 'coverage', value: coverage, label: `${Math.round(coverage)}% coverage` };
        }
        return { type: 'coverage', value: null, label: 'No coverage data' };
      }
      case 'eslint': {
        const metric = qualityData.fileMetrics?.eslint?.find(m => m.file === filePath);
        if (metric) {
          const parts = [];
          if (metric.errorCount > 0) parts.push(`${metric.errorCount} error${metric.errorCount > 1 ? 's' : ''}`);
          if (metric.warningCount > 0) parts.push(`${metric.warningCount} warning${metric.warningCount > 1 ? 's' : ''}`);
          return { type: 'eslint', value: metric, label: parts.length > 0 ? parts.join(', ') : 'No issues' };
        }
        return { type: 'eslint', value: null, label: 'No lint data' };
      }
      case 'typescript': {
        const metric = qualityData.fileMetrics?.typescript?.find(m => m.file === filePath);
        if (metric) {
          const errors = metric.errorCount;
          return { type: 'typescript', value: metric, label: errors > 0 ? `${errors} type error${errors > 1 ? 's' : ''}` : 'No type errors' };
        }
        return { type: 'typescript', value: null, label: 'No type data' };
      }
      case 'prettier': {
        const metric = qualityData.fileMetrics?.prettier?.find(m => m.file === filePath);
        if (metric) {
          const issues = metric.issueCount;
          return { type: 'prettier', value: metric, label: issues > 0 ? `${issues} formatting issue${issues > 1 ? 's' : ''}` : 'Properly formatted' };
        }
        return { type: 'prettier', value: null, label: 'No format data' };
      }
      case 'knip': {
        const metric = qualityData.fileMetrics?.knip?.find(m => m.file === filePath);
        if (metric) {
          const issues = metric.issueCount;
          return { type: 'knip', value: metric, label: issues > 0 ? `${issues} unused export${issues > 1 ? 's' : ''}` : 'No dead code' };
        }
        return { type: 'knip', value: null, label: 'No dead code data' };
      }
      case 'alexandria': {
        const metric = qualityData.fileMetrics?.alexandria?.find(m => m.file === filePath);
        if (metric) {
          const issues = metric.issueCount;
          return { type: 'alexandria', value: metric, label: issues > 0 ? `${issues} doc issue${issues > 1 ? 's' : ''}` : 'Well documented' };
        }
        return { type: 'alexandria', value: null, label: 'No doc data' };
      }
      default:
        return null;
    }
  }, [hoverInfo?.hoveredBuilding?.path, colorMode, qualitySlice?.data]);

  // Compute tree stats from cityData
  const computedTreeStats = useMemo(() => {
    if (!cityData) {
      return null;
    }

    // Use metadata if available
    if (
      cityData.metadata?.totalFiles !== undefined &&
      cityData.metadata?.totalDirectories !== undefined
    ) {
      return {
        fileCount: cityData.metadata.totalFiles,
        directoryCount: cityData.metadata.totalDirectories,
      };
    }

    // Count files from buildings array and directories from districts tree
    const fileCount = cityData.buildings?.length || 0;
    let directoryCount = 0;

    const countDistricts = (districts: CityDistrict[]) => {
      for (const district of districts) {
        directoryCount++;
        if (district.children) {
          countDistricts(district.children);
        }
      }
    };

    if (cityData.districts) {
      countDistricts(cityData.districts);
    }

    return { fileCount, directoryCount };
  }, [cityData]);

  // Memoize the hover handler
  const handleHover = useCallback((info: HoverInfo) => {
    setHoverInfo(info);
  }, []);

  // Generate file color layers from city data
  const fileColorLayers = useMemo(() => {
    if (!cityData || !cityData.buildings) {
      return [];
    }

    // Create file color layers based on file extensions
    const layers = createFileColorHighlightLayers(cityData.buildings);
    return layers;
  }, [cityData]);

  // Generate git status layers from city data and git slice
  const gitStatusLayers = useMemo((): HighlightLayer[] => {
    if (!cityData || !cityData.buildings || !gitSlice?.data) {
      return [];
    }

    const gitStatus = gitSlice.data;
    const buildingsByPath = new Map(
      cityData.buildings.map((b) => [b.path, b])
    );

    const createLayerItems = (paths: string[]): LayerItem[] => {
      const items: LayerItem[] = [];
      for (const path of paths) {
        const building = buildingsByPath.get(path);
        if (building) {
          items.push({
            path: building.path,
            type: 'file' as const,
            renderStrategy: 'fill',
          });
        }
      }
      return items;
    };

    const layers: HighlightLayer[] = [];

    // Staged files (green)
    if (gitStatus.staged.length > 0) {
      const items = createLayerItems(gitStatus.staged);
      if (items.length > 0) {
        layers.push({
          id: 'git-highlight-staged',
          name: 'Staged',
          enabled: true,
          color: GIT_STATUS_COLORS.staged,
          priority: 100,
          items,
        });
      }
    }

    // Unstaged/modified files (yellow)
    if (gitStatus.unstaged.length > 0) {
      const items = createLayerItems(gitStatus.unstaged);
      if (items.length > 0) {
        layers.push({
          id: 'git-highlight-unstaged',
          name: 'Modified',
          enabled: true,
          color: GIT_STATUS_COLORS.unstaged,
          priority: 90,
          items,
        });
      }
    }

    // Untracked files (gray)
    if (gitStatus.untracked.length > 0) {
      const items = createLayerItems(gitStatus.untracked);
      if (items.length > 0) {
        layers.push({
          id: 'git-highlight-untracked',
          name: 'Untracked',
          enabled: true,
          color: GIT_STATUS_COLORS.untracked,
          priority: 80,
          items,
        });
      }
    }

    // Deleted files (red) - these may not have buildings, but include for completeness
    if (gitStatus.deleted.length > 0) {
      const items = createLayerItems(gitStatus.deleted);
      if (items.length > 0) {
        layers.push({
          id: 'git-highlight-deleted',
          name: 'Deleted',
          enabled: true,
          color: GIT_STATUS_COLORS.deleted,
          priority: 110,
          items,
        });
      }
    }

    return layers;
  }, [cityData, gitSlice?.data]);

  // Generate quality-based layers using the utility functions
  const qualityLayers = useMemo((): HighlightLayer[] => {
    if (!cityData?.buildings) return [];

    // Only compute if we're in a quality color mode
    if (colorMode === 'fileTypes' || colorMode === 'git') return [];

    return getLayersForColorMode(
      colorMode,
      cityData.buildings,
      qualitySlice?.data,
      [], // Not needed for quality modes
      []  // Not needed for quality modes
    );
  }, [cityData, colorMode, qualitySlice?.data]);

  // Compute whether git/agent layers exist
  const hasGitOrAgentLayers = useMemo(() => {
    return highlightLayers.some(
      (layer) =>
        (layer.id.includes('git-highlight') ||
          layer.id.includes('agent') ||
          layer.id.includes('event-highlight')) &&
        !layer.id.startsWith('ext-')
    );
  }, [highlightLayers]);

  // Compute legend file types by grouping primary/secondary layers
  const legendFileTypes = useMemo((): LegendFileType[] => {
    // Group layers by extension (ext-ts-primary, ext-ts-secondary -> ts)
    const groupedByExt = new Map<string, { primary?: typeof highlightLayers[0]; secondary?: typeof highlightLayers[0] }>();

    highlightLayers.forEach((layer) => {
      // Match ext-{name}-primary or ext-{name}-secondary
      const match = layer.id.match(/^ext-(\w+)-(primary|secondary)$/);
      if (match) {
        const [, ext, type] = match;
        if (!groupedByExt.has(ext)) {
          groupedByExt.set(ext, {});
        }
        const group = groupedByExt.get(ext)!;
        if (type === 'primary') {
          group.primary = layer;
        } else {
          group.secondary = layer;
        }
      }
    });

    // Convert to LegendFileType array
    const fileTypes: LegendFileType[] = [];
    groupedByExt.forEach((group, ext) => {
      if (group.primary) {
        fileTypes.push({
          id: ext,
          name: group.primary.name,
          fillColor: group.primary.color,
          borderColor: group.secondary?.color,
          count: group.primary.items.length,
          enabled: group.primary.enabled,
        });
      }
    });

    // Sort by count (most files first)
    return fileTypes.sort((a, b) => b.count - a.count);
  }, [highlightLayers]);

  // Compute legend git status items from highlight layers
  const legendGitStatus = useMemo((): LegendGitStatus[] => {
    const gitLayers = highlightLayers.filter((layer) =>
      layer.id.startsWith('git-highlight-')
    );

    return gitLayers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      color: layer.color,
      count: layer.items.length,
      enabled: layer.enabled,
    }));
  }, [highlightLayers]);

  // Compute legend agent layer items from highlight layers
  const legendAgentLayers = useMemo((): LegendAgentLayer[] => {
    const agentLayers = highlightLayers.filter((layer) =>
      layer.id.startsWith('event-highlight')
    );

    return agentLayers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      color: layer.color,
      count: layer.items.length,
      enabled: layer.enabled,
    }));
  }, [highlightLayers]);

  // Compute legend quality metrics from highlight layers (for quality color modes)
  const legendQualityMetrics = useMemo((): LegendQualityMetric[] => {
    // Check if we're in a quality color mode
    const qualityModeIds = ['coverage', 'eslint', 'typescript', 'prettier', 'knip', 'alexandria'];
    if (!qualityModeIds.includes(colorMode)) {
      return [];
    }

    // Find quality layers based on the color mode prefix
    const qualityLayerPrefixes: Record<string, string> = {
      coverage: 'coverage-',
      eslint: 'eslint-',
      typescript: 'typescript-',
      prettier: 'prettier-',
      knip: 'knip-',
      alexandria: 'alexandria-',
    };

    const prefix = qualityLayerPrefixes[colorMode];
    if (!prefix) return [];

    const relevantLayers = highlightLayers.filter((layer) =>
      layer.id.startsWith(prefix)
    );

    return relevantLayers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      color: layer.color,
      count: layer.items.length,
      enabled: layer.enabled,
    }));
  }, [highlightLayers, colorMode]);

  // Toggle git status layer
  const toggleGitStatus = useCallback((id: string) => {
    setHighlightLayers((prev) =>
      prev.map((layer) => {
        if (layer.id === id) {
          return { ...layer, enabled: !layer.enabled };
        }
        return layer;
      })
    );
  }, []);

  // Toggle agent layer
  const toggleAgentLayer = useCallback((id: string) => {
    setHighlightLayers((prev) =>
      prev.map((layer) => {
        if (layer.id === id) {
          return { ...layer, enabled: !layer.enabled };
        }
        return layer;
      })
    );
  }, []);

  // Clear all agent layers
  const clearAgentLayers = useCallback(() => {
    setHighlightLayers((prev) =>
      prev.filter((layer) => !layer.id.startsWith('event-highlight'))
    );
    agentLayersRegistered.current = false;
  }, []);

  // Toggle quality metric layer
  const toggleQualityMetric = useCallback((id: string) => {
    setHighlightLayers((prev) =>
      prev.map((layer) => {
        if (layer.id === id) {
          return { ...layer, enabled: !layer.enabled };
        }
        return layer;
      })
    );
  }, []);

  // Toggle layers by extension (toggles both primary and secondary)
  const toggleFileType = useCallback((ext: string) => {
    setHighlightLayers((prev) => {
      // Find current state from primary layer
      const primaryLayer = prev.find((l) => l.id === `ext-${ext}-primary`);
      const newEnabled = primaryLayer ? !primaryLayer.enabled : true;

      return prev.map((layer) => {
        if (layer.id === `ext-${ext}-primary` || layer.id === `ext-${ext}-secondary`) {
          return { ...layer, enabled: newEnabled };
        }
        return layer;
      });
    });
  }, []);

  // Update highlight layers based on color mode
  // This effect manages which layers are shown based on the selected color mode
  useEffect(() => {
    // Get agent layers (they're always shown on top when present)
    const agentLayers = agentHighlightLayersSlice?.data || [];
    const formattedAgentLayers: HighlightLayer[] = agentLayers.map((layer, idx) => ({
      id: layer.id || `event-highlight-${idx}`,
      name: layer.name,
      enabled: layer.enabled,
      color: layer.color,
      priority: layer.priority || 150, // High priority so they're on top
      items: layer.items,
    }));

    // Get layers for the selected color mode
    let modeLayers: HighlightLayer[] = [];

    switch (colorMode) {
      case 'fileTypes':
        modeLayers = fileColorLayers.map((layer) => ({
          id: layer.id,
          name: layer.name,
          enabled: true,
          color: layer.color,
          opacity: layer.opacity,
          borderWidth: layer.borderWidth,
          priority: layer.priority || 0,
          items: layer.items,
        }));
        break;

      case 'git':
        modeLayers = gitStatusLayers;
        break;

      default:
        // Quality modes (coverage, eslint, typescript, etc.)
        modeLayers = qualityLayers;
        break;
    }

    // Combine mode layers with agent layers (agent layers on top)
    const allLayers = [...modeLayers, ...formattedAgentLayers];
    setHighlightLayers(allLayers);

    // Update tracking refs
    fileColorLayersRegistered.current = colorMode === 'fileTypes';
    gitLayersRegistered.current = colorMode === 'git';
    agentLayersRegistered.current = formattedAgentLayers.length > 0;
  }, [colorMode, fileColorLayers, gitStatusLayers, qualityLayers, agentHighlightLayersSlice?.data]);

  // Load city data from file tree
  useEffect(() => {
    if (!fileTreeSlice?.data || !fileTreeSlice.data.allFiles) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Convert FileTree.allFiles to FileInfo format for code-city-builder
      const fileInfoList = fileTreeSlice.data.allFiles.map((file) => {
        const pathParts = file.path.split('/');
        const fileName = file.name || pathParts[pathParts.length - 1];
        const extension = fileName.includes('.') ? fileName.split('.').pop() || '' : '';

        return {
          path: file.path,
          name: fileName,
          extension,
          size: file.size || 1000,
          lastModified: new Date(),
          isDirectory: false,
          relativePath: file.path,
        };
      });

      // Build the file system tree
      const fileSystemTree = buildFileSystemTreeFromFileInfoList(
        fileInfoList,
        fileTreeSlice.data.sha || 'unknown'
      );

      // Create a builder instance
      const builder = new CodeCityBuilderWithGrid();

      // Build the city data - use empty string for relative paths
      const data = builder.buildCityFromFileSystem(fileSystemTree, '');

      setCityData(data);
    } catch (error) {
      console.error('Failed to generate city data:', error);
    } finally {
      setLoading(false);
    }
  }, [fileTreeSlice?.data, fileTreeSlice?.loading, context.currentScope.repository?.path]);

  // Handle file click
  const handleFileClick = useCallback(
    (filePath: string) => {
      if (actions.openFile) {
        actions.openFile(filePath);
      }
    },
    [actions]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: theme.colors.background,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderBottom: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.backgroundLight,
        }}
      >
        {/* First row: Title and actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 16px',
            borderBottom: `1px solid ${theme.colors.border}`,
            flexShrink: 0,
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapIcon size={16} style={{ color: theme.colors.primary }} />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>
              Code City Map
            </span>
          </div>

          {/* Color mode selector */}
          <div
            ref={colorModeDropdownRef}
            style={{ position: 'relative' }}
          >
            <button
              onClick={() => setShowColorModeDropdown(!showColorModeDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                color: theme.colors.text,
                backgroundColor: theme.colors.background,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                minWidth: '120px',
              }}
              title="Change color mode"
            >
              <span style={{ flex: 1, textAlign: 'left' }}>
                {currentColorModeConfig.name}
              </span>
              <ChevronDown
                size={14}
                style={{
                  transform: showColorModeDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease',
                }}
              />
            </button>

            {/* Dropdown menu */}
            {showColorModeDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: theme.colors.background,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  zIndex: 100,
                  overflow: 'hidden',
                  minWidth: '160px',
                }}
              >
                {availableColorModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setColorMode(mode.id);
                      setShowColorModeDropdown(false);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: mode.id === colorMode ? theme.colors.primary : theme.colors.text,
                      backgroundColor: mode.id === colorMode ? theme.colors.primary + '15' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (mode.id !== colorMode) {
                        e.currentTarget.style.backgroundColor = theme.colors.backgroundLight;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (mode.id !== colorMode) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span style={{ fontWeight: mode.id === colorMode ? 600 : 400 }}>
                      {mode.name}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        color: theme.colors.textSecondary,
                        marginTop: '2px',
                      }}
                    >
                      {mode.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {(legendFileTypes.length > 0 || legendGitStatus.length > 0 || legendQualityMetrics.length > 0 || computedTreeStats) && (
            <button
              onClick={() => setShowLegend(!showLegend)}
              style={{
                fontSize: '12px',
                color: showLegend
                  ? theme.colors.primary
                  : theme.colors.textSecondary,
                backgroundColor: showLegend
                  ? theme.colors.primary + '22'
                  : theme.colors.background,
                padding: '2px 8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: showLegend
                  ? `1px solid ${theme.colors.primary}`
                  : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title={showLegend ? 'Hide legend' : 'Show legend'}
            >
              <List size={12} />
              Legend
            </button>
          )}
        </div>
      </div>

      {/* Main content area with map and legend */}
      <div
        ref={contentContainerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: layout.legendPosition === 'right' ? 'row' : 'column',
        }}
      >
        {/* City visualization with hover bar */}
        <div
          style={{
            minWidth: layout.legendPosition === 'right' ? layout.minMapSize : undefined,
            minHeight: layout.legendPosition === 'bottom' ? layout.minMapSize : undefined,
            flex: 1,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Map area */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: theme.colors.textSecondary,
                }}
              >
                Loading repository structure...
              </div>
            ) : !cityData ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: theme.colors.textSecondary,
                  gap: '12px',
                }}
              >
                <MapIcon size={32} style={{ opacity: 0.5 }} />
                <div>
                  {context.currentScope.repository
                    ? 'Building code city visualization...'
                    : 'No repository loaded'}
                </div>
              </div>
            ) : (
              <ArchitectureMapHighlightLayers
                cityData={cityData}
                highlightLayers={highlightLayers}
                showLayerControls={false}
                onLayerToggle={() => {}}
                defaultDirectoryColor="#111827"
                onFileClick={handleFileClick}
                showFileTypeIcons={true}
                className="w-full h-full"
                showLegend={false}
                showDirectoryLabels={true}
                onHover={handleHover}
              />
            )}
          </div>

          {/* Hover Information Bar - inside map area */}
          <div
            style={{
              height: '48px',
              borderTop: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.background,
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              fontSize: '12px',
              color: theme.colors.text,
              gap: '12px',
              flexShrink: 0,
            }}
          >
            {hoverInfo &&
            (hoverInfo.hoveredBuilding || hoverInfo.hoveredDistrict) ? (
              <>
                {/* File/Directory name and path */}
                <div
                  style={{
                    flex: '1 1 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1px',
                    minWidth: 0,
                  }}
                >
                  {/* Name (filename or last directory part) */}
                  <div
                    style={{
                      fontWeight: 600,
                      color: theme.colors.primary,
                      fontSize: '13px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {hoverInfo.fileTooltip?.text ||
                      hoverInfo.hoveredDistrict?.path?.split('/').pop() ||
                      hoverInfo.hoveredDistrict?.path ||
                      'Unknown'}
                  </div>
                  {/* Path */}
                  <div
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: '10px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {hoverInfo.hoveredBuilding?.path ||
                      hoverInfo.hoveredDistrict?.path ||
                      '/'}
                  </div>
                </div>

                {/* File count for directories */}
                {hoverInfo.hoveredDistrict && hoverInfo.fileCount !== null && (
                  <div
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: '11px',
                      flexShrink: 0,
                    }}
                  >
                    {hoverInfo.fileCount}{' '}
                    {hoverInfo.fileCount === 1 ? 'file' : 'files'}
                  </div>
                )}

                {/* Quality metric for files in quality color modes */}
                {hoverInfo.hoveredBuilding && hoveredFileMetric && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      backgroundColor: theme.colors.backgroundLight,
                      borderRadius: '4px',
                      border: `1px solid ${theme.colors.border}`,
                      fontSize: '11px',
                      fontWeight: 500,
                      color: hoveredFileMetric.value === null
                        ? theme.colors.textSecondary
                        : theme.colors.text,
                      flexShrink: 0,
                    }}
                  >
                    {hoveredFileMetric.label}
                  </div>
                )}
              </>
            ) : (
              /* Default help text when not hovering */
              <div
                style={{
                  color: theme.colors.textSecondary,
                  fontStyle: 'italic',
                  fontSize: '11px',
                }}
              >
                Hover over files and directories to see details • Click to open
              </div>
            )}
          </div>
        </div>

        {/* Legend panel - positioned based on layout */}
        {showLegend && (legendFileTypes.length > 0 || legendGitStatus.length > 0 || legendAgentLayers.length > 0 || legendQualityMetrics.length > 0 || computedTreeStats) && (
          <Legend
            fileTypes={legendFileTypes}
            gitStatus={legendGitStatus}
            agentLayers={legendAgentLayers}
            qualityMetrics={legendQualityMetrics}
            colorMode={colorMode}
            stats={computedTreeStats}
            onItemClick={toggleFileType}
            onGitStatusClick={toggleGitStatus}
            onAgentLayerClick={toggleAgentLayer}
            onQualityMetricClick={toggleQualityMetric}
            onClearAgentLayers={clearAgentLayers}
            position={layout.legendPosition}
            maxSize={layout.legendMaxSize}
          />
        )}
      </div>
    </div>
  );
};

/**
 * CodeCityPanel - A code visualization panel using the Code City map.
 *
 * This panel shows:
 * - 3D visualization of repository structure
 * - File and directory hierarchy as a city metaphor
 * - Interactive hover and click functionality
 * - Highlight layers for different file types
 *
 * Note: This component expects to be rendered within a ThemeProvider from the host.
 */
export const CodeCityPanel: React.FC<PanelComponentProps> = (props) => {
  return <CodeCityPanelContent {...props} />;
};

/**
 * Preview component for panel selection
 */
export const CodeCityPanelPreview: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div
      style={{
        padding: '12px',
        fontSize: '12px',
        color: theme.colors.text,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        height: '80px',
      }}
    >
      <Building2 size={32} style={{ color: theme.colors.primary }} />
      <span
        style={{
          fontSize: '11px',
          color: theme.colors.textSecondary,
        }}
      >
        3D Code City
      </span>
    </div>
  );
};
