import React from 'react';
import { Activity, X, BarChart3 } from 'lucide-react';
import { useTheme } from '@principal-ade/industry-theme';
import type { ColorMode } from '../utils/qualityLayers';

export interface LegendFileType {
  id: string;
  name: string;
  fillColor: string;
  borderColor?: string;
  count: number;
  enabled: boolean;
}

export interface LegendGitStatus {
  id: string;
  name: string;
  color: string;
  count: number;
  enabled: boolean;
}

export interface LegendAgentLayer {
  id: string;
  name: string;
  color: string;
  count: number;
  enabled: boolean;
}

export interface LegendQualityMetric {
  id: string;
  name: string;
  color: string;
  count: number;
  enabled: boolean;
}

interface LegendProps {
  fileTypes: LegendFileType[];
  gitStatus?: LegendGitStatus[];
  agentLayers?: LegendAgentLayer[];
  qualityMetrics?: LegendQualityMetric[];
  colorMode?: ColorMode;
  onItemClick?: (id: string) => void;
  onGitStatusClick?: (id: string) => void;
  onAgentLayerClick?: (id: string) => void;
  onQualityMetricClick?: (id: string) => void;
  onClearAgentLayers?: () => void;
  position?: 'bottom' | 'right';
  maxSize?: number;
}

/**
 * Legend component that displays file type colors and layer information.
 * Shows styled rectangles that mimic the actual building rendering.
 * Supports both bottom and right positioning with responsive layout.
 */
export const Legend: React.FC<LegendProps> = ({
  fileTypes,
  gitStatus,
  agentLayers,
  qualityMetrics,
  colorMode,
  onItemClick,
  onGitStatusClick,
  onAgentLayerClick,
  onQualityMetricClick,
  onClearAgentLayers,
  position = 'bottom',
  maxSize,
}) => {
  const { theme } = useTheme();

  const hasGitStatus = gitStatus && gitStatus.length > 0;
  const hasAgentLayers = agentLayers && agentLayers.length > 0;
  const hasQualityMetrics = qualityMetrics && qualityMetrics.length > 0;

  if (fileTypes.length === 0 && !hasGitStatus && !hasAgentLayers && !hasQualityMetrics) {
    return null;
  }

  // Get the quality mode label for display
  const qualityModeLabels: Record<string, string> = {
    coverage: 'Test Coverage',
    eslint: 'Linting Quality',
    typescript: 'Type Safety',
    prettier: 'Code Formatting',
    knip: 'Dead Code Analysis',
    alexandria: 'Documentation',
  };

  const isRight = position === 'right';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: theme.colors.background,
        borderTop: isRight ? 'none' : `1px solid ${theme.colors.border}`,
        borderLeft: isRight ? `1px solid ${theme.colors.border}` : 'none',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        ...(isRight
          ? {
              width: maxSize,
              maxWidth: maxSize,
              height: '100%',
            }
          : {
              maxHeight: maxSize && maxSize > 0 ? maxSize : undefined,
              width: '100%',
            }),
        flexShrink: 0,
      }}
    >
      {/* Quality metrics section - shows coverage/linting/type safety metrics */}
      {hasQualityMetrics && colorMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 600,
              color: theme.colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <BarChart3 size={12} />
            {qualityModeLabels[colorMode] || 'Quality Metrics'}
          </div>

          {/* Quality metric items */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {qualityMetrics!.map((metric) => (
              <button
                key={metric.id}
                onClick={() => onQualityMetricClick?.(metric.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  backgroundColor: theme.colors.backgroundLight,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '4px',
                  cursor: onQualityMetricClick ? 'pointer' : 'default',
                  opacity: metric.enabled ? 1 : 0.4,
                  transition: 'all 0.15s ease',
                  minWidth: '100px',
                  flex: '1 1 100px',
                  maxWidth: '200px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Colored circle for metric category */}
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: metric.color,
                    borderRadius: '50%',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    color: theme.colors.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {metric.name}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: theme.colors.textSecondary,
                    flexShrink: 0,
                  }}
                >
                  {metric.count} {metric.count === 1 ? 'file' : 'files'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent activity section - shows active agent layers */}
      {hasAgentLayers && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: theme.colors.primary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <Activity size={12} />
              Agent Activity
            </div>
            {onClearAgentLayers && (
              <button
                onClick={onClearAgentLayers}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  color: theme.colors.textSecondary,
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '3px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Clear agent activity"
              >
                <X size={10} />
                Clear
              </button>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {agentLayers!.map((layer) => (
              <button
                key={layer.id}
                onClick={() => onAgentLayerClick?.(layer.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  backgroundColor: theme.colors.backgroundLight,
                  border: `1px solid ${theme.colors.primary}40`,
                  borderRadius: '4px',
                  cursor: onAgentLayerClick ? 'pointer' : 'default',
                  opacity: layer.enabled ? 1 : 0.4,
                  transition: 'all 0.15s ease',
                  minWidth: '120px',
                  flex: '1 1 120px',
                  maxWidth: '250px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Colored circle for agent layer */}
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: layer.color,
                    borderRadius: '50%',
                    flexShrink: 0,
                    boxShadow: `0 0 4px ${layer.color}80`,
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    color: theme.colors.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {layer.name}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: theme.colors.textSecondary,
                    flexShrink: 0,
                  }}
                >
                  {layer.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Git status section */}
      {hasGitStatus && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: theme.colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Git Changes
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {gitStatus!.map((status) => (
              <button
                key={status.id}
                onClick={() => onGitStatusClick?.(status.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  backgroundColor: theme.colors.backgroundLight,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '4px',
                  cursor: onGitStatusClick ? 'pointer' : 'default',
                  opacity: status.enabled ? 1 : 0.4,
                  transition: 'all 0.15s ease',
                  minWidth: '100px',
                  flex: '1 1 100px',
                  maxWidth: '200px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Colored circle for git status */}
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: status.color,
                    borderRadius: '50%',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    color: theme.colors.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {status.name}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: theme.colors.textSecondary,
                    flexShrink: 0,
                  }}
                >
                  {status.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File types section */}
      {fileTypes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: theme.colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            File Types
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {fileTypes.map((fileType) => (
              <button
                key={fileType.id}
                onClick={() => onItemClick?.(fileType.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  backgroundColor: theme.colors.backgroundLight,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '4px',
                  cursor: onItemClick ? 'pointer' : 'default',
                  opacity: fileType.enabled ? 1 : 0.4,
                  transition: 'all 0.15s ease',
                  minWidth: '100px',
                  flex: '1 1 100px',
                  maxWidth: '200px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Styled rectangle preview */}
                <div
                  style={{
                    width: '18px',
                    height: '14px',
                    backgroundColor: fileType.fillColor,
                    border: fileType.borderColor
                      ? `2px solid ${fileType.borderColor}`
                      : 'none',
                    borderRadius: '2px',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    color: theme.colors.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {fileType.name}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: theme.colors.textSecondary,
                    flexShrink: 0,
                  }}
                >
                  {fileType.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
