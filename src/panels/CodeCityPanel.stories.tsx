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
            root: { path: '/Users/example/my-project' },
            sha: 'abc123',
            allFiles: [
              { path: 'src/index.ts', name: 'index.ts', size: 1024 },
              { path: 'src/components/App.tsx', name: 'App.tsx', size: 2048 },
              { path: 'src/components/Button.tsx', name: 'Button.tsx', size: 512 },
              { path: 'src/utils/helpers.ts', name: 'helpers.ts', size: 768 },
              { path: 'package.json', name: 'package.json', size: 256 },
              { path: 'README.md', name: 'README.md', size: 1536 },
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
    const allFiles = [];
    const dirs = ['src', 'tests', 'docs', 'lib', 'utils'];
    const extensions = ['ts', 'tsx', 'js', 'jsx', 'json', 'md'];

    for (let i = 0; i < 100; i++) {
      const dir = dirs[i % dirs.length];
      const ext = extensions[i % extensions.length];
      const name = `file${i}.${ext}`;
      allFiles.push({
        path: `${dir}/${name}`,
        name,
        size: Math.floor(Math.random() * 10000) + 100,
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
              root: { path: '/Users/example/large-project' },
              sha: 'def456',
              allFiles,
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

/**
 * With Git Changes - demonstrates git status highlighting
 */
export const WithGitChanges: Story = {
  render: (args) => (
    <MockPanelProvider
      repository={{
        path: '/Users/example/my-project',
        name: 'my-project',
      }}
      slices={{
        fileTree: {
          data: {
            root: { path: '/Users/example/my-project' },
            sha: 'abc123',
            allFiles: [
              { path: 'src/index.ts', name: 'index.ts', size: 1024 },
              { path: 'src/components/App.tsx', name: 'App.tsx', size: 2048 },
              { path: 'src/components/Button.tsx', name: 'Button.tsx', size: 512 },
              { path: 'src/components/NewFeature.tsx', name: 'NewFeature.tsx', size: 1024 },
              { path: 'src/utils/helpers.ts', name: 'helpers.ts', size: 768 },
              { path: 'src/utils/newUtils.ts', name: 'newUtils.ts', size: 512 },
              { path: 'package.json', name: 'package.json', size: 256 },
              { path: 'README.md', name: 'README.md', size: 1536 },
            ],
          },
          loading: false,
          error: null,
        },
        git: {
          data: {
            staged: ['src/components/App.tsx'],
            unstaged: ['src/index.ts', 'src/utils/helpers.ts'],
            untracked: ['src/components/NewFeature.tsx', 'src/utils/newUtils.ts'],
            deleted: [],
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
