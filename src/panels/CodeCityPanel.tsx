import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  MapIcon,
  HelpCircle,
  File,
  Folder,
  Layers,
  Eye,
  EyeOff,
  Building2,
} from 'lucide-react';
import { ThemeProvider, useTheme } from '@principal-ade/industry-theme';
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
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [highlightLayers, setHighlightLayers] = useState<HighlightLayer[]>([]);
  const [loading, setLoading] = useState(false);

  // Get file tree slice for generating city data
  // Uses FileTree format from @principal-ai/repository-abstraction
  const fileTreeSlice = context.getSlice<FileTree>('fileTree');

  // Track whether file color layers are currently registered
  const fileColorLayersRegistered = useRef(false);
  const lastHasGitOrAgentLayers = useRef<boolean | null>(null);

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

  // Compute whether git/agent layers exist
  const hasGitOrAgentLayers = useMemo(() => {
    return highlightLayers.some(
      (layer) =>
        (layer.id.includes('git-highlight') ||
          layer.id.includes('agent') ||
          layer.id.includes('event-highlight')) &&
        !layer.id.includes('file-color')
    );
  }, [highlightLayers]);

  // Toggle layer enabled state
  const setLayerEnabled = useCallback((layerId: string, enabled: boolean) => {
    setHighlightLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, enabled } : layer
      )
    );
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
        (layer, idx) => ({
          id: `file-color-${idx}`,
          name: layer.name,
          enabled: true,
          color: layer.color,
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
        prev.filter((layer) => !layer.id.includes('file-color'))
      );
      fileColorLayersRegistered.current = false;
    }
  }, [hasGitOrAgentLayers, fileColorLayers]);

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

      // Build the city data - use root.path from FileTree
      const rootPath = fileTreeSlice.data.root?.path || context.currentScope.repository?.path || '/';
      const data = builder.buildCityFromFileSystem(fileSystemTree, rootPath);

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

            {/* Stats badges */}
            {computedTreeStats &&
              typeof computedTreeStats.fileCount === 'number' &&
              typeof computedTreeStats.directoryCount === 'number' && (
                <>
                  <span
                    style={{
                      fontSize: '12px',
                      color: theme.colors.textSecondary,
                      backgroundColor: theme.colors.background,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <File size={12} />
                    {computedTreeStats.fileCount.toLocaleString()}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: theme.colors.textSecondary,
                      backgroundColor: theme.colors.background,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Folder size={12} />
                    {computedTreeStats.directoryCount.toLocaleString()}
                  </span>
                </>
              )}

            {highlightLayers.length > 0 && (
              <button
                onClick={() => setShowLayersPanel(!showLayersPanel)}
                style={{
                  fontSize: '12px',
                  color: showLayersPanel
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                  backgroundColor: showLayersPanel
                    ? theme.colors.primary + '22'
                    : theme.colors.background,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: showLayersPanel
                    ? `1px solid ${theme.colors.primary}`
                    : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                title={
                  showLayersPanel ? 'Hide layers panel' : 'Show layers panel'
                }
              >
                <Layers size={12} />
                {highlightLayers.length} layer
                {highlightLayers.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Help button */}
            <button
              onClick={() => {
                // TODO: Show help modal
              }}
              style={{
                height: '32px',
                padding: '0 12px',
                fontSize: '12px',
                backgroundColor: 'transparent',
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Help"
            >
              <HelpCircle size={12} />
              Help
            </button>
          </div>
        </div>

        {/* Second row: Layers carousel */}
        {showLayersPanel && highlightLayers.length > 0 && (
          <div
            style={{
              padding: '8px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                overflowY: 'hidden',
                padding: '4px 0',
                scrollbarWidth: 'thin',
              }}
            >
              {highlightLayers.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setLayerEnabled(layer.id, !layer.enabled)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    backgroundColor: layer.enabled
                      ? theme.colors.backgroundLight
                      : theme.colors.background,
                    border: `1px solid ${layer.enabled ? layer.color : theme.colors.border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                    opacity: layer.enabled ? 1 : 0.6,
                    cursor: 'pointer',
                  }}
                  title={
                    layer.enabled ? `Hide ${layer.name}` : `Show ${layer.name}`
                  }
                >
                  {/* Color indicator */}
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      backgroundColor: layer.color,
                      flexShrink: 0,
                    }}
                  />

                  {/* Layer name and count */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        color: theme.colors.text,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {layer.name}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: theme.colors.textSecondary,
                      }}
                    >
                      {layer.items.length} item
                      {layer.items.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Status indicator */}
                  {layer.enabled ? (
                    <Eye size={14} color={theme.colors.primary} />
                  ) : (
                    <EyeOff size={14} color={theme.colors.textSecondary} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* City visualization content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
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
              {/* Full path */}
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
 */
export const CodeCityPanel: React.FC<PanelComponentProps> = (props) => {
  return (
    <ThemeProvider>
      <CodeCityPanelContent {...props} />
    </ThemeProvider>
  );
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
