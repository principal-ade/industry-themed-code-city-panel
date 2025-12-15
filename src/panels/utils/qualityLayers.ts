/**
 * Quality highlight layer generators for Code City visualization
 *
 * Creates highlight layers from quality metrics data (coverage, linting, etc.)
 */

import type { CityBuilding, LayerItem } from '@principal-ai/code-city-react';

/**
 * Per-file metric data from quality lenses
 */
export interface FileMetricData {
  file: string;
  score: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  hintCount: number;
  fixableCount?: number;
  categories?: Record<string, number>;
}

/**
 * Quality data slice structure
 */
export interface QualitySliceData {
  fileCoverage?: Record<string, number>;
  fileMetrics?: {
    eslint?: FileMetricData[];
    typescript?: FileMetricData[];
    prettier?: FileMetricData[];
    knip?: FileMetricData[];
    alexandria?: FileMetricData[];
  };
}

/**
 * Highlight layer structure
 */
export interface HighlightLayer {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  priority: number;
  items: LayerItem[];
}

/**
 * Color mode options for the visualization
 */
export type ColorMode =
  | 'fileTypes'
  | 'git'
  | 'coverage'
  | 'eslint'
  | 'typescript'
  | 'prettier'
  | 'knip'
  | 'alexandria';

/**
 * Color mode configuration
 */
export interface ColorModeConfig {
  id: ColorMode;
  name: string;
  description: string;
  icon?: string;
}

/**
 * Available color modes
 */
export const COLOR_MODES: ColorModeConfig[] = [
  { id: 'fileTypes', name: 'File Types', description: 'Color by file extension' },
  { id: 'git', name: 'Git Status', description: 'Color by git changes' },
  { id: 'coverage', name: 'Test Coverage', description: 'Color by test coverage %' },
  { id: 'eslint', name: 'Linting', description: 'Color by ESLint issues' },
  { id: 'typescript', name: 'Type Safety', description: 'Color by TypeScript errors' },
  { id: 'prettier', name: 'Formatting', description: 'Color by Prettier issues' },
  { id: 'knip', name: 'Dead Code', description: 'Color by unused exports' },
  { id: 'alexandria', name: 'Documentation', description: 'Color by doc coverage' },
];

/**
 * Default color modes (always available without quality data)
 */
export const DEFAULT_COLOR_MODES: ColorModeConfig[] = [
  { id: 'fileTypes', name: 'File Types', description: 'Color by file extension' },
  { id: 'git', name: 'Git Status', description: 'Color by git changes' },
];

/**
 * Quality-based color modes (require quality data)
 */
export const QUALITY_COLOR_MODES: ColorModeConfig[] = [
  { id: 'coverage', name: 'Test Coverage', description: 'Color by test coverage %' },
  { id: 'eslint', name: 'Linting', description: 'Color by ESLint issues' },
  { id: 'typescript', name: 'Type Safety', description: 'Color by TypeScript errors' },
  { id: 'prettier', name: 'Formatting', description: 'Color by Prettier issues' },
  { id: 'knip', name: 'Dead Code', description: 'Color by unused exports' },
  { id: 'alexandria', name: 'Documentation', description: 'Color by doc coverage' },
];

/**
 * Code City color modes slice data structure.
 * Hosts populate this slice to control which color modes are available.
 * If not populated, only default modes (fileTypes, git) are available.
 */
export interface CodeCityColorModesSliceData {
  /** Additional color modes to enable (beyond fileTypes and git) */
  enabledModes?: ColorMode[];
  /** Quality data for quality-based color modes */
  qualityData?: QualitySliceData;
}

/**
 * Convert a score (0-100) to a color on the red-yellow-green gradient
 * Higher scores = greener (better)
 */
export function scoreToColor(score: number): string {
  // Clamp score to 0-100
  const s = Math.max(0, Math.min(100, score));

  if (s >= 80) return '#22c55e'; // green-500
  if (s >= 60) return '#84cc16'; // lime-500
  if (s >= 40) return '#eab308'; // yellow-500
  if (s >= 20) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/**
 * Convert coverage percentage to color
 * High coverage = green, low coverage = red
 */
export function coverageToColor(coverage: number): string {
  return scoreToColor(coverage);
}

/**
 * Convert issue count to color (inverse - fewer issues = greener)
 * Uses a log scale for better distribution
 */
export function issueCountToColor(issueCount: number, maxIssues: number = 50): string {
  if (issueCount === 0) return '#22c55e'; // Perfect - green

  // Log scale: 1 issue = ~80, maxIssues = ~0
  const logScore = Math.max(0, 100 - (Math.log(issueCount + 1) / Math.log(maxIssues + 1)) * 100);
  return scoreToColor(logScore);
}

/**
 * Color thresholds for gradient legend
 */
export const SCORE_THRESHOLDS = [
  { min: 80, max: 100, color: '#22c55e', label: 'Excellent' },
  { min: 60, max: 79, color: '#84cc16', label: 'Good' },
  { min: 40, max: 59, color: '#eab308', label: 'Fair' },
  { min: 20, max: 39, color: '#f97316', label: 'Poor' },
  { min: 0, max: 19, color: '#ef4444', label: 'Critical' },
];

/**
 * Create highlight layers for test coverage visualization
 */
export function createCoverageHighlightLayers(
  buildings: CityBuilding[],
  fileCoverage: Record<string, number>
): HighlightLayer[] {
  const buildingsByPath = new Map(buildings.map((b) => [b.path, b]));

  // Group files by coverage range - using clear percentage ranges
  const layerGroups: Record<string, LayerItem[]> = {
    high: [],      // 80-100%
    medium: [],    // 50-79%
    low: [],       // 20-49%
    veryLow: [],   // 1-19%
    zero: [],      // 0%
    noData: [],    // No coverage data
  };

  for (const [path, building] of buildingsByPath) {
    const coverage = fileCoverage[path];

    if (coverage === undefined) {
      layerGroups.noData.push({
        path: building.path,
        type: 'file' as const,
        renderStrategy: 'fill',
      });
    } else if (coverage >= 80) {
      layerGroups.high.push({
        path: building.path,
        type: 'file' as const,
        renderStrategy: 'fill',
      });
    } else if (coverage >= 50) {
      layerGroups.medium.push({
        path: building.path,
        type: 'file' as const,
        renderStrategy: 'fill',
      });
    } else if (coverage >= 20) {
      layerGroups.low.push({
        path: building.path,
        type: 'file' as const,
        renderStrategy: 'fill',
      });
    } else if (coverage > 0) {
      layerGroups.veryLow.push({
        path: building.path,
        type: 'file' as const,
        renderStrategy: 'fill',
      });
    } else {
      layerGroups.zero.push({
        path: building.path,
        type: 'file' as const,
        renderStrategy: 'fill',
      });
    }
  }

  const layers: HighlightLayer[] = [];

  if (layerGroups.high.length > 0) {
    layers.push({
      id: 'coverage-high',
      name: '80-100%',
      enabled: true,
      color: '#22c55e',
      priority: 50,
      items: layerGroups.high,
    });
  }

  if (layerGroups.medium.length > 0) {
    layers.push({
      id: 'coverage-medium',
      name: '50-79%',
      enabled: true,
      color: '#eab308',
      priority: 50,
      items: layerGroups.medium,
    });
  }

  if (layerGroups.low.length > 0) {
    layers.push({
      id: 'coverage-low',
      name: '20-49%',
      enabled: true,
      color: '#f97316',
      priority: 50,
      items: layerGroups.low,
    });
  }

  if (layerGroups.veryLow.length > 0) {
    layers.push({
      id: 'coverage-verylow',
      name: '1-19%',
      enabled: true,
      color: '#ef4444',
      priority: 50,
      items: layerGroups.veryLow,
    });
  }

  if (layerGroups.zero.length > 0) {
    layers.push({
      id: 'coverage-zero',
      name: '0%',
      enabled: true,
      color: '#991b1b',
      priority: 50,
      items: layerGroups.zero,
    });
  }

  if (layerGroups.noData.length > 0) {
    layers.push({
      id: 'coverage-nodata',
      name: 'No data',
      enabled: true,
      color: '#6b7280',
      priority: 40,
      items: layerGroups.noData,
    });
  }

  return layers;
}

/**
 * Create highlight layers for file metrics (ESLint, TypeScript, etc.)
 * Uses issue-count-based categories for clarity
 */
export function createMetricHighlightLayers(
  buildings: CityBuilding[],
  metrics: FileMetricData[],
  metricId: string,
  _metricName: string
): HighlightLayer[] {
  const buildingsByPath = new Map(buildings.map((b) => [b.path, b]));
  const metricsByPath = new Map(metrics.map((m) => [m.file, m]));

  // Group files by issue count - more intuitive than abstract scores
  const layerGroups: Record<string, LayerItem[]> = {
    clean: [],      // 0 issues
    minor: [],      // 1-3 issues
    moderate: [],   // 4-10 issues
    significant: [], // 11-25 issues
    severe: [],     // 26+ issues
    noData: [],     // No metric data
  };

  for (const [path, building] of buildingsByPath) {
    const metric = metricsByPath.get(path);

    if (!metric) {
      layerGroups.noData.push({
        path: building.path,
        type: 'file' as const,
        renderStrategy: 'fill',
      });
    } else {
      const issues = metric.issueCount;
      let bucket: keyof typeof layerGroups;
      if (issues === 0) bucket = 'clean';
      else if (issues <= 3) bucket = 'minor';
      else if (issues <= 10) bucket = 'moderate';
      else if (issues <= 25) bucket = 'significant';
      else bucket = 'severe';

      layerGroups[bucket].push({
        path: building.path,
        type: 'file' as const,
        renderStrategy: 'fill',
      });
    }
  }

  const layers: HighlightLayer[] = [];

  if (layerGroups.clean.length > 0) {
    layers.push({
      id: `${metricId}-clean`,
      name: '0 issues',
      enabled: true,
      color: '#22c55e',
      priority: 50,
      items: layerGroups.clean,
    });
  }

  if (layerGroups.minor.length > 0) {
    layers.push({
      id: `${metricId}-minor`,
      name: '1-3 issues',
      enabled: true,
      color: '#84cc16',
      priority: 50,
      items: layerGroups.minor,
    });
  }

  if (layerGroups.moderate.length > 0) {
    layers.push({
      id: `${metricId}-moderate`,
      name: '4-10 issues',
      enabled: true,
      color: '#eab308',
      priority: 50,
      items: layerGroups.moderate,
    });
  }

  if (layerGroups.significant.length > 0) {
    layers.push({
      id: `${metricId}-significant`,
      name: '11-25 issues',
      enabled: true,
      color: '#f97316',
      priority: 50,
      items: layerGroups.significant,
    });
  }

  if (layerGroups.severe.length > 0) {
    layers.push({
      id: `${metricId}-severe`,
      name: '26+ issues',
      enabled: true,
      color: '#ef4444',
      priority: 50,
      items: layerGroups.severe,
    });
  }

  if (layerGroups.noData.length > 0) {
    layers.push({
      id: `${metricId}-nodata`,
      name: 'No data',
      enabled: true,
      color: '#6b7280',
      priority: 40,
      items: layerGroups.noData,
    });
  }

  return layers;
}

/**
 * Create ESLint highlight layers
 */
export function createEslintHighlightLayers(
  buildings: CityBuilding[],
  eslintMetrics: FileMetricData[]
): HighlightLayer[] {
  return createMetricHighlightLayers(buildings, eslintMetrics, 'eslint', 'Linting');
}

/**
 * Create TypeScript highlight layers
 */
export function createTypescriptHighlightLayers(
  buildings: CityBuilding[],
  typescriptMetrics: FileMetricData[]
): HighlightLayer[] {
  return createMetricHighlightLayers(buildings, typescriptMetrics, 'typescript', 'Type Safety');
}

/**
 * Create Prettier highlight layers
 */
export function createPrettierHighlightLayers(
  buildings: CityBuilding[],
  prettierMetrics: FileMetricData[]
): HighlightLayer[] {
  return createMetricHighlightLayers(buildings, prettierMetrics, 'prettier', 'Formatting');
}

/**
 * Create Knip highlight layers
 */
export function createKnipHighlightLayers(
  buildings: CityBuilding[],
  knipMetrics: FileMetricData[]
): HighlightLayer[] {
  return createMetricHighlightLayers(buildings, knipMetrics, 'knip', 'Dead Code');
}

/**
 * Create Alexandria highlight layers
 */
export function createAlexandriaHighlightLayers(
  buildings: CityBuilding[],
  alexandriaMetrics: FileMetricData[]
): HighlightLayer[] {
  return createMetricHighlightLayers(buildings, alexandriaMetrics, 'alexandria', 'Documentation');
}

/**
 * Check if quality data is available for a given color mode
 */
export function isColorModeAvailable(
  mode: ColorMode,
  qualityData: QualitySliceData | null | undefined,
  hasGitData: boolean
): boolean {
  if (mode === 'fileTypes') return true;
  if (mode === 'git') return hasGitData;

  if (!qualityData) return false;

  switch (mode) {
    case 'coverage':
      return !!qualityData.fileCoverage && Object.keys(qualityData.fileCoverage).length > 0;
    case 'eslint':
      return !!qualityData.fileMetrics?.eslint && qualityData.fileMetrics.eslint.length > 0;
    case 'typescript':
      return !!qualityData.fileMetrics?.typescript && qualityData.fileMetrics.typescript.length > 0;
    case 'prettier':
      return !!qualityData.fileMetrics?.prettier && qualityData.fileMetrics.prettier.length > 0;
    case 'knip':
      return !!qualityData.fileMetrics?.knip && qualityData.fileMetrics.knip.length > 0;
    case 'alexandria':
      return !!qualityData.fileMetrics?.alexandria && qualityData.fileMetrics.alexandria.length > 0;
    default:
      return false;
  }
}

/**
 * Get highlight layers for a given color mode
 */
export function getLayersForColorMode(
  mode: ColorMode,
  buildings: CityBuilding[],
  qualityData: QualitySliceData | null | undefined,
  fileColorLayers: HighlightLayer[],
  gitLayers: HighlightLayer[]
): HighlightLayer[] {
  switch (mode) {
    case 'fileTypes':
      return fileColorLayers;

    case 'git':
      return gitLayers;

    case 'coverage':
      if (qualityData?.fileCoverage) {
        return createCoverageHighlightLayers(buildings, qualityData.fileCoverage);
      }
      return [];

    case 'eslint':
      if (qualityData?.fileMetrics?.eslint) {
        return createEslintHighlightLayers(buildings, qualityData.fileMetrics.eslint);
      }
      return [];

    case 'typescript':
      if (qualityData?.fileMetrics?.typescript) {
        return createTypescriptHighlightLayers(buildings, qualityData.fileMetrics.typescript);
      }
      return [];

    case 'prettier':
      if (qualityData?.fileMetrics?.prettier) {
        return createPrettierHighlightLayers(buildings, qualityData.fileMetrics.prettier);
      }
      return [];

    case 'knip':
      if (qualityData?.fileMetrics?.knip) {
        return createKnipHighlightLayers(buildings, qualityData.fileMetrics.knip);
      }
      return [];

    case 'alexandria':
      if (qualityData?.fileMetrics?.alexandria) {
        return createAlexandriaHighlightLayers(buildings, qualityData.fileMetrics.alexandria);
      }
      return [];

    default:
      return fileColorLayers;
  }
}
