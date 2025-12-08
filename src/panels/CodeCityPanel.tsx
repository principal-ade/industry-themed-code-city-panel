import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  MapIcon,
  Building2,
  List,
} from 'lucide-react';
import { Legend, LegendFileType, LegendGitStatus } from './components/Legend';
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

  // Compute layout: square map + legend position
  const layout = useMemo(() => {
    if (!containerSize) {
      return { mapSize: 0, legendPosition: 'bottom' as const, legendSize: 0 };
    }

    const { width, height } = containerSize;
    const isLandscape = width > height;

    if (isLandscape) {
      // Landscape: map is square based on height, legend goes to the right
      const mapSize = height;
      const legendSize = width - mapSize;
      return { mapSize, legendPosition: 'right' as const, legendSize };
    } else {
      // Portrait: map is square based on width, legend goes below
      const mapSize = width;
      const legendSize = height - mapSize;
      return { mapSize, legendPosition: 'bottom' as const, legendSize };
    }
  }, [containerSize]);

  // Get file tree slice for generating city data
  // Uses FileTree format from @principal-ai/repository-abstraction
  const fileTreeSlice = context.getSlice<FileTree>('fileTree');

  // Get git status slice for highlighting changed files
  const gitSlice = context.getSlice<GitStatus>('git');

  // Track whether file color layers are currently registered
  const fileColorLayersRegistered = useRef(false);
  const gitLayersRegistered = useRef(false);
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
      lastHasGitOrAgentLayers.current = null;
      lastRepoPath.current = currentRepoPath;
    }
  }, [currentRepoPath]);

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

  // Register/unregister file suffix color layers
  useEffect(() => {
    const shouldShowFileColors =
      !hasGitOrAgentLayers && fileColorLayers.length > 0;

    const gitAgentStateChanged =
      lastHasGitOrAgentLayers.current !== hasGitOrAgentLayers;
    if (gitAgentStateChanged) {
      lastHasGitOrAgentLayers.current = hasGitOrAgentLayers;
    }

    // Register file color layers if they should be shown
    if (shouldShowFileColors && !fileColorLayersRegistered.current) {
      const newLayers: HighlightLayer[] = fileColorLayers.map(
        (layer) => ({
          id: layer.id,
          name: layer.name,
          enabled: true,
          color: layer.color,
          opacity: layer.opacity,
          borderWidth: layer.borderWidth,
          priority: layer.priority || 0,
          items: layer.items,
        })
      );
      setHighlightLayers((prev) => [...prev, ...newLayers]);
      fileColorLayersRegistered.current = true;
    }
    // Unregister file color layers if they shouldn't be shown
    else if (!shouldShowFileColors && fileColorLayersRegistered.current) {
      setHighlightLayers((prev) =>
        prev.filter((layer) => !layer.id.startsWith('ext-'))
      );
      fileColorLayersRegistered.current = false;
    }
  }, [hasGitOrAgentLayers, fileColorLayers]);

  // Register/unregister git status layers
  useEffect(() => {
    const hasGitLayers = gitStatusLayers.length > 0;

    // Register git layers if they're available and not yet registered
    if (hasGitLayers && !gitLayersRegistered.current) {
      setHighlightLayers((prev) => [...prev, ...gitStatusLayers]);
      gitLayersRegistered.current = true;
    }
    // Unregister git layers if they're no longer available
    else if (!hasGitLayers && gitLayersRegistered.current) {
      setHighlightLayers((prev) =>
        prev.filter((layer) => !layer.id.startsWith('git-highlight-'))
      );
      gitLayersRegistered.current = false;
    }
    // Update git layers if they changed (e.g., file moved from unstaged to staged)
    else if (hasGitLayers && gitLayersRegistered.current) {
      setHighlightLayers((prev) => {
        const nonGitLayers = prev.filter((l) => !l.id.startsWith('git-highlight-'));
        return [...nonGitLayers, ...gitStatusLayers];
      });
    }
  }, [gitStatusLayers]);

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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapIcon size={16} style={{ color: theme.colors.primary }} />
              <span style={{ fontWeight: 600, fontSize: '14px' }}>
                Code City Map
              </span>
            </div>

            {(legendFileTypes.length > 0 || legendGitStatus.length > 0 || computedTreeStats) && (
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
                  marginLeft: 'auto',
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
        {/* City visualization */}
        <div
          style={{
            width: layout.legendPosition === 'right' ? layout.mapSize : '100%',
            height: layout.legendPosition === 'bottom' ? layout.mapSize : '100%',
            flexShrink: 0,
            position: 'relative',
          }}
        >
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

        {/* Legend panel - positioned based on layout */}
        {showLegend && (legendFileTypes.length > 0 || legendGitStatus.length > 0 || computedTreeStats) && (
          <Legend
            fileTypes={legendFileTypes}
            gitStatus={legendGitStatus}
            stats={computedTreeStats}
            onItemClick={toggleFileType}
            onGitStatusClick={toggleGitStatus}
            position={layout.legendPosition}
            maxSize={layout.legendSize}
          />
        )}
      </div>

      {/* Hover Information Bar */}
      <div
        style={{
          height: '56px',
          borderTop: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.background,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          fontSize: '13px',
          color: theme.colors.text,
          gap: '16px',
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
                gap: '2px',
                minWidth: 0,
              }}
            >
              {/* Name (filename or last directory part) */}
              <div
                style={{
                  fontWeight: 600,
                  color: theme.colors.primary,
                  fontSize: '14px',
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
                  fontSize: '11px',
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
                  fontSize: '12px',
                  flexShrink: 0,
                }}
              >
                {hoverInfo.fileCount}{' '}
                {hoverInfo.fileCount === 1 ? 'file' : 'files'}
              </div>
            )}
          </>
        ) : (
          /* Default help text when not hovering */
          <div
            style={{
              color: theme.colors.textSecondary,
              fontStyle: 'italic',
            }}
          >
            Hover over files and directories to see details • Click files to
            open
          </div>
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
