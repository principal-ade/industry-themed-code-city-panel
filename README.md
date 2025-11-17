# Code City Panel Extension

A 3D code visualization panel extension for `@principal-ade/panel-framework-core` that displays repository structure using the Code City metaphor. Files are represented as buildings and directories as city blocks, providing an intuitive and visually engaging way to explore codebases.

## Features

- **3D Visualization**: Interactive 3D rendering of repository structure
- **Code City Metaphor**: Files as buildings, directories as districts
- **Interactive Exploration**: Hover for details, click to open files
- **Highlight Layers**: Support for multiple highlight layers (git changes, file types, etc.)
- **Responsive Design**: Adapts to different panel sizes
- **Theme Integration**: Full support for industry theme system
- **Performance**: Efficient rendering for large codebases

## Installation

```bash
npm install @principal-ade/industry-themed-code-city-panel
# or
bun install @principal-ade/industry-themed-code-city-panel
```

## Usage

The panel will be automatically discovered by the host application when installed. No additional configuration is required.

### Panel ID

```
principal-ade.code-city-panel
```

### Required Data Slices

- `fileTree`: File tree structure of the repository

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/principal-ade/industry-themed-code-city-panel.git
cd industry-themed-code-city-panel

# Install dependencies
bun install
```

### Development Workflow

```bash
# Start Storybook for interactive development
bun run storybook

# Build for production
bun run build

# Type checking
bun run typecheck

# Linting
bun run lint
bun run lint:fix

# Format code
bun run format
bun run format:check
```

### Project Structure

```
industry-themed-code-city-panel/
├── src/
│   ├── panels/
│   │   ├── CodeCityPanel.tsx          # Main panel component
│   │   └── CodeCityPanel.stories.tsx  # Storybook stories
│   ├── types/
│   │   └── index.ts                   # TypeScript type definitions
│   ├── mocks/
│   │   └── panelContext.tsx           # Mock providers for Storybook
│   └── index.tsx                      # Main entry - exports panels array
├── .storybook/                        # Storybook configuration
├── dist/                              # Built output (generated)
├── package.json                       # Package configuration
├── tsconfig.json                      # TypeScript config
├── vite.config.ts                     # Build configuration
└── README.md                          # This file
```

## Component API

### CodeCityPanel Props

The panel receives standard `PanelComponentProps`:

```typescript
interface PanelComponentProps {
  context: PanelContextValue;  // Access to repository data
  actions: PanelActions;        // Actions for host interaction
  events: PanelEventEmitter;    // Event system
}
```

### Context Usage

```typescript
// Access file tree data
const fileTreeSlice = context.getSlice('fileTree');

// Check repository information
const repoPath = context.currentScope.repository?.path;
const repoName = context.currentScope.repository?.name;

// Refresh data
await context.refresh('repository', 'fileTree');
```

### Available Actions

```typescript
// Open a file in the editor
actions.openFile?.('src/index.ts');

// Navigate to another panel
actions.navigateToPanel?.('panel-id');
```

## Features in Detail

### City Visualization

The panel uses the `@principal-ai/code-city-react` library to render an interactive 3D code city:

- **Buildings**: Each file is represented as a building
  - Height: Based on file size or line count
  - Color: Based on file type or highlight layers
  - Position: Organized within parent directory districts

- **Districts**: Directories are represented as city blocks
  - Contains buildings (files) and sub-districts (subdirectories)
  - Labeled with directory name
  - Interactive hover shows file count

### Highlight Layers

The panel supports multiple highlight layers that can be toggled on/off:

- **File Type Layers**: Automatically generated based on file extensions
- **Git Layers**: Can highlight changed files, staged files, etc.
- **Custom Layers**: Support for additional custom highlight layers

### Hover Information

When hovering over elements in the city:
- File name and full path displayed in footer
- Directory file count shown
- Building/district highlighted

### Responsive Design

The panel automatically adapts to different sizes:
- Toolbar collapses on smaller screens
- Stats badges adjust layout
- City view scales appropriately

## Building and Publishing

### Build

```bash
bun run build
```

This creates:
- `dist/panels.bundle.js` - Main bundle
- `dist/index.d.ts` - TypeScript declarations
- Source maps for debugging

### Local Testing

```bash
# In this directory
bun run build
bun link

# In host application
bun link @principal-ade/industry-themed-code-city-panel
```

### Publishing

```bash
# Ensure everything is built
bun run build

# Publish to NPM
npm publish --access public
```

## Dependencies

### Peer Dependencies

- `react` >= 19.0.0
- `react-dom` >= 19.0.0

### Main Dependencies

- `@principal-ai/code-city-react` - Code city visualization library
- `@principal-ade/industry-theme` - Theme system
- `@principal-ade/panel-framework-core` - Panel framework
- `lucide-react` - Icon library

## Troubleshooting

### Panel Not Loading

Ensure:
1. Panel is installed in the host application
2. Panel ID matches registration: `principal-ade.code-city-panel`
3. Required data slice `fileTree` is available

### Build Errors

```bash
# Clean and rebuild
bun run clean
bun run build
```

### Type Errors

```bash
# Run type checking
bun run typecheck
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and type checking
6. Submit a pull request

## License

MIT © Principal AI

## Support

For issues and questions:
- [GitHub Issues](https://github.com/principal-ade/industry-themed-code-city-panel/issues)
- [Documentation](https://github.com/principal-ade/panel-framework)

## Related Projects

- [@principal-ade/panel-framework-core](https://github.com/principal-ade/panel-framework-core)
- [@principal-ai/code-city-react](https://github.com/principal-ai/code-city-react)
- [@principal-ade/industry-theme](https://github.com/principal-ade/industry-theme)
