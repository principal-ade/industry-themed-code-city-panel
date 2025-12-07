import React from 'react';
import { File, Folder } from 'lucide-react';
import { useTheme } from '@principal-ade/industry-theme';

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

interface LegendStats {
  fileCount: number;
  directoryCount: number;
}

interface LegendProps {
  fileTypes: LegendFileType[];
  gitStatus?: LegendGitStatus[];
  stats?: LegendStats | null;
  onItemClick?: (id: string) => void;
  onGitStatusClick?: (id: string) => void;
}

/**
 * Legend component that displays file type colors and layer information.
 * Shows styled rectangles that mimic the actual building rendering.
 */
export const Legend: React.FC<LegendProps> = ({ fileTypes, gitStatus, stats, onItemClick, onGitStatusClick }) => {
  const { theme } = useTheme();

  const hasGitStatus = gitStatus && gitStatus.length > 0;

  if (fileTypes.length === 0 && !stats && !hasGitStatus) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: theme.colors.background,
        borderTop: `1px solid ${theme.colors.border}`,
        overflowY: 'auto',
        maxHeight: '200px',
        flexShrink: 0,
      }}
    >
      {/* File types section - rendered first in reverse order (appears at bottom) */}
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
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 120px))',
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
                  width: '100%',
                  maxWidth: '120px',
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
                  }}
                >
                  {fileType.name}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: theme.colors.textSecondary,
                  }}
                >
                  {fileType.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Git status section - rendered second in reverse order (appears in middle) */}
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
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 120px))',
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
                  width: '100%',
                  maxWidth: '120px',
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
                  }}
                >
                  {status.name}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: theme.colors.textSecondary,
                  }}
                >
                  {status.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats row - rendered last in reverse order (appears at top) */}
      {stats && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '12px',
            color: theme.colors.textSecondary,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <File size={12} />
            {stats.fileCount.toLocaleString()} files
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Folder size={12} />
            {stats.directoryCount.toLocaleString()} folders
          </span>
        </div>
      )}
    </div>
  );
};
