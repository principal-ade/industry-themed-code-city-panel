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

/**
 * With Test Coverage - demonstrates coverage color mode
 * Use the dropdown to select "Test Coverage" to see files colored by coverage %
 */
export const WithTestCoverage: Story = {
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
              { path: 'src/components/Form.tsx', name: 'Form.tsx', size: 1024 },
              { path: 'src/utils/helpers.ts', name: 'helpers.ts', size: 768 },
              { path: 'src/utils/validation.ts', name: 'validation.ts', size: 512 },
              { path: 'src/api/client.ts', name: 'client.ts', size: 1536 },
              { path: 'src/api/endpoints.ts', name: 'endpoints.ts', size: 768 },
              { path: 'package.json', name: 'package.json', size: 256 },
              { path: 'README.md', name: 'README.md', size: 1536 },
            ],
          },
          loading: false,
          error: null,
        },
        quality: {
          data: {
            fileCoverage: {
              'src/index.ts': 95,
              'src/components/App.tsx': 82,
              'src/components/Button.tsx': 100,
              'src/components/Form.tsx': 45,
              'src/utils/helpers.ts': 78,
              'src/utils/validation.ts': 92,
              'src/api/client.ts': 25,
              'src/api/endpoints.ts': 10,
            },
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
 * With Linting Issues - demonstrates ESLint color mode
 * Use the dropdown to select "Linting" to see files colored by lint score
 */
export const WithLintingIssues: Story = {
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
              { path: 'src/components/Form.tsx', name: 'Form.tsx', size: 1024 },
              { path: 'src/utils/helpers.ts', name: 'helpers.ts', size: 768 },
              { path: 'src/utils/legacy.ts', name: 'legacy.ts', size: 2048 },
              { path: 'src/api/client.ts', name: 'client.ts', size: 1536 },
            ],
          },
          loading: false,
          error: null,
        },
        quality: {
          data: {
            fileMetrics: {
              eslint: [
                { file: 'src/index.ts', score: 95, issueCount: 1, errorCount: 0, warningCount: 1, infoCount: 0, hintCount: 0 },
                { file: 'src/components/App.tsx', score: 85, issueCount: 3, errorCount: 0, warningCount: 2, infoCount: 1, hintCount: 0 },
                { file: 'src/components/Button.tsx', score: 100, issueCount: 0, errorCount: 0, warningCount: 0, infoCount: 0, hintCount: 0 },
                { file: 'src/components/Form.tsx', score: 60, issueCount: 8, errorCount: 2, warningCount: 4, infoCount: 2, hintCount: 0 },
                { file: 'src/utils/helpers.ts', score: 75, issueCount: 5, errorCount: 1, warningCount: 3, infoCount: 1, hintCount: 0 },
                { file: 'src/utils/legacy.ts', score: 15, issueCount: 25, errorCount: 10, warningCount: 12, infoCount: 3, hintCount: 0 },
                { file: 'src/api/client.ts', score: 40, issueCount: 12, errorCount: 4, warningCount: 6, infoCount: 2, hintCount: 0 },
              ],
            },
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
 * With All Quality Metrics - demonstrates all available quality data
 * Use the dropdown to switch between different quality visualizations
 */
export const WithAllQualityMetrics: Story = {
  render: (args) => {
    const allFiles = [
      { path: 'src/index.ts', name: 'index.ts', size: 1024 },
      { path: 'src/components/App.tsx', name: 'App.tsx', size: 2048 },
      { path: 'src/components/Button.tsx', name: 'Button.tsx', size: 512 },
      { path: 'src/components/Form.tsx', name: 'Form.tsx', size: 1024 },
      { path: 'src/components/Modal.tsx', name: 'Modal.tsx', size: 768 },
      { path: 'src/utils/helpers.ts', name: 'helpers.ts', size: 768 },
      { path: 'src/utils/validation.ts', name: 'validation.ts', size: 512 },
      { path: 'src/utils/formatting.ts', name: 'formatting.ts', size: 384 },
      { path: 'src/api/client.ts', name: 'client.ts', size: 1536 },
      { path: 'src/api/endpoints.ts', name: 'endpoints.ts', size: 768 },
      { path: 'src/types/index.ts', name: 'index.ts', size: 512 },
      { path: 'src/types/api.ts', name: 'api.ts', size: 384 },
    ];

    const filePaths = allFiles.map(f => f.path);

    return (
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
              allFiles,
            },
            loading: false,
            error: null,
          },
          quality: {
            data: {
              fileCoverage: {
                'src/index.ts': 88,
                'src/components/App.tsx': 72,
                'src/components/Button.tsx': 100,
                'src/components/Form.tsx': 45,
                'src/components/Modal.tsx': 60,
                'src/utils/helpers.ts': 95,
                'src/utils/validation.ts': 90,
                'src/utils/formatting.ts': 80,
                'src/api/client.ts': 35,
                'src/api/endpoints.ts': 20,
                'src/types/index.ts': 100,
                'src/types/api.ts': 100,
              },
              fileMetrics: {
                eslint: filePaths.map((file, i) => ({
                  file,
                  score: [95, 80, 100, 55, 70, 90, 85, 75, 40, 30, 100, 95][i] || 80,
                  issueCount: [1, 4, 0, 10, 6, 2, 3, 5, 15, 20, 0, 1][i] || 2,
                  errorCount: [0, 1, 0, 3, 2, 0, 1, 1, 5, 8, 0, 0][i] || 0,
                  warningCount: [1, 2, 0, 5, 3, 1, 2, 3, 8, 10, 0, 1][i] || 1,
                  infoCount: [0, 1, 0, 2, 1, 1, 0, 1, 2, 2, 0, 0][i] || 0,
                  hintCount: 0,
                })),
                typescript: filePaths.map((file, i) => ({
                  file,
                  score: [100, 85, 100, 60, 75, 95, 100, 90, 50, 45, 100, 100][i] || 85,
                  issueCount: [0, 3, 0, 8, 5, 1, 0, 2, 12, 15, 0, 0][i] || 2,
                  errorCount: [0, 3, 0, 8, 5, 1, 0, 2, 12, 15, 0, 0][i] || 2,
                  warningCount: 0,
                  infoCount: 0,
                  hintCount: 0,
                })),
                prettier: filePaths.map((file, i) => ({
                  file,
                  score: [100, 100, 100, 70, 100, 100, 85, 100, 60, 50, 100, 100][i] || 90,
                  issueCount: [0, 0, 0, 6, 0, 0, 3, 0, 8, 10, 0, 0][i] || 1,
                  errorCount: 0,
                  warningCount: [0, 0, 0, 6, 0, 0, 3, 0, 8, 10, 0, 0][i] || 1,
                  infoCount: 0,
                  hintCount: 0,
                })),
              },
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
