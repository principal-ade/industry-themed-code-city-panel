import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodeCityPanel } from './CodeCityPanel';
import { MockPanelProvider } from '../mocks/panelContext';

/**
 * CodeCityPanel provides a 3D visualization of repository structure
 * using the Code City metaphor. Files are represented as buildings
 * and directories as city blocks.
 */
const meta: Meta<typeof CodeCityPanel> = {
  title: 'Panels/CodeCityPanel',
  component: CodeCityPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A 3D code city visualization panel that displays repository structure using buildings to represent files and districts for directories.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CodeCityPanel>;

/**
 * Default story showing the panel with a repository loaded
 */
export const Default: Story = {
  render: (args) => (
    <MockPanelProvider
      repository={{
        path: '/Users/example/my-project',
        name: 'my-project',
      }}
      slices={{
        fileTree: {
          data: {
            root: '/Users/example/my-project',
            files: [
              { path: 'src/index.ts', size: 1024, lines: 50 },
              { path: 'src/components/App.tsx', size: 2048, lines: 100 },
              { path: 'src/components/Button.tsx', size: 512, lines: 25 },
              { path: 'src/utils/helpers.ts', size: 768, lines: 35 },
              { path: 'package.json', size: 256, lines: 15 },
              { path: 'README.md', size: 1536, lines: 75 },
            ],
          },
          loading: false,
          error: null,
        },
      }}
    >
      <CodeCityPanel {...args} />
    </MockPanelProvider>
  ),
};

/**
 * Loading state story
 */
export const Loading: Story = {
  render: (args) => (
    <MockPanelProvider
      repository={{
        path: '/Users/example/my-project',
        name: 'my-project',
      }}
      slices={{
        fileTree: {
          data: null,
          loading: true,
          error: null,
        },
      }}
    >
      <CodeCityPanel {...args} />
    </MockPanelProvider>
  ),
};

/**
 * No repository loaded story
 */
export const NoRepository: Story = {
  render: (args) => (
    <MockPanelProvider repository={null}>
      <CodeCityPanel {...args} />
    </MockPanelProvider>
  ),
};

/**
 * Large repository story
 */
export const LargeRepository: Story = {
  render: (args) => {
    // Generate a large file tree
    const files = [];
    const dirs = ['src', 'tests', 'docs', 'lib', 'utils'];
    const extensions = ['ts', 'tsx', 'js', 'jsx', 'json', 'md'];

    for (let i = 0; i < 100; i++) {
      const dir = dirs[i % dirs.length];
      const ext = extensions[i % extensions.length];
      files.push({
        path: `${dir}/file${i}.${ext}`,
        size: Math.floor(Math.random() * 10000) + 100,
        lines: Math.floor(Math.random() * 500) + 10,
      });
    }

    return (
      <MockPanelProvider
        repository={{
          path: '/Users/example/large-project',
          name: 'large-project',
        }}
        slices={{
          fileTree: {
            data: {
              root: '/Users/example/large-project',
              files,
            },
            loading: false,
            error: null,
          },
        }}
      >
        <CodeCityPanel {...args} />
      </MockPanelProvider>
    );
  },
};
