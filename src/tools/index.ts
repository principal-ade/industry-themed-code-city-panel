/**
 * Panel Tools
 *
 * UTCP-compatible tools for the Code City panel extension.
 * These tools can be invoked by AI agents and emit events that panels listen for.
 *
 * IMPORTANT: This file should NOT import any React components to ensure
 * it can be imported server-side without pulling in React dependencies.
 * Use the './tools' subpath export for server-safe imports.
 */

import type { PanelTool, PanelToolsMetadata } from '@principal-ade/utcp-panel-event';

/**
 * Tool: Focus Building
 */
export const focusBuildingTool: PanelTool = {
  name: 'focus_building',
  description: 'Focuses the camera on a specific file (building) in the code city visualization',
  inputs: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file to focus on',
      },
      animate: {
        type: 'boolean',
        description: 'Whether to animate the camera transition',
      },
    },
    required: ['filePath'],
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' },
    },
  },
  tags: ['navigation', 'camera', 'focus'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: 'industry-theme.code-city-panel:focus-building',
  },
};

/**
 * Tool: Select District
 */
export const selectDistrictTool: PanelTool = {
  name: 'select_district',
  description: 'Selects and highlights a directory (district) in the code city visualization',
  inputs: {
    type: 'object',
    properties: {
      directoryPath: {
        type: 'string',
        description: 'Path to the directory to select',
      },
      expandChildren: {
        type: 'boolean',
        description: 'Whether to expand and show child buildings',
      },
    },
    required: ['directoryPath'],
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      selectedDistrict: { type: 'string' },
    },
  },
  tags: ['selection', 'district', 'directory'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: 'industry-theme.code-city-panel:select-district',
  },
};

/**
 * Tool: Reset View
 */
export const resetViewTool: PanelTool = {
  name: 'reset_view',
  description: 'Resets the code city view to the default camera position',
  inputs: {
    type: 'object',
    properties: {
      animate: {
        type: 'boolean',
        description: 'Whether to animate the camera reset',
      },
    },
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
    },
  },
  tags: ['navigation', 'camera', 'reset'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: 'industry-theme.code-city-panel:reset-view',
  },
};

/**
 * All tools exported as an array.
 */
export const codeCityPanelTools: PanelTool[] = [
  focusBuildingTool,
  selectDistrictTool,
  resetViewTool,
];

/**
 * Panel tools metadata for registration with PanelToolRegistry.
 */
export const codeCityPanelToolsMetadata: PanelToolsMetadata = {
  id: 'industry-theme.code-city-panel',
  name: 'Code City Panel',
  description: 'Tools provided by the code city visualization panel extension',
  tools: codeCityPanelTools,
};
