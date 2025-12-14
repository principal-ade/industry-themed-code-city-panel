import { CodeCityPanel } from './panels/CodeCityPanel';
import type { PanelDefinition, PanelContextValue } from './types';
import { codeCityPanelTools } from './tools';

/**
 * Export array of panel definitions.
 * This is the required export for panel extensions.
 */
export const panels: PanelDefinition[] = [
  {
    metadata: {
      id: 'principal-ade.code-city-panel',
      name: 'File City Map',
      icon: '🏙️',
      version: '0.1.0',
      author: 'Principal AI',
      description:
        '3D visualization of repository structure using the Code City metaphor',
      slices: ['fileTree'], // Data slices this panel depends on
      // UTCP-compatible tools this panel exposes
      tools: codeCityPanelTools,
    },
    component: CodeCityPanel,

    // Optional: Called when this specific panel is mounted
    onMount: async (context: PanelContextValue) => {
      // eslint-disable-next-line no-console
      console.log(
        'Code City Panel mounted',
        context.currentScope.repository?.path
      );

      // Refresh file tree data if available
      if (context.hasSlice('fileTree') && !context.isSliceLoading('fileTree')) {
        await context.refresh('repository', 'fileTree');
      }
    },

    // Optional: Called when this specific panel is unmounted
    onUnmount: async (_context: PanelContextValue) => {
      // eslint-disable-next-line no-console
      console.log('Code City Panel unmounting');
    },
  },
];

/**
 * Optional: Called once when the entire package is loaded.
 * Use this for package-level initialization.
 */
export const onPackageLoad = async () => {
  // eslint-disable-next-line no-console
  console.log('Panel package loaded - Code City Panel Extension');
};

/**
 * Optional: Called once when the package is unloaded.
 * Use this for package-level cleanup.
 */
export const onPackageUnload = async () => {
  // eslint-disable-next-line no-console
  console.log('Panel package unloading - Code City Panel Extension');
};

/**
 * Export tools for server-safe imports.
 * Use '@industry-theme/code-city-panel/tools' to import without React dependencies.
 */
export {
  codeCityPanelTools,
  codeCityPanelToolsMetadata,
  focusBuildingTool,
  selectDistrictTool,
  resetViewTool,
} from './tools';
