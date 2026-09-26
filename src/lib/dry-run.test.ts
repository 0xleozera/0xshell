import { describe, expect, test } from 'bun:test';
import { homedir } from 'node:os';
import { buildDryRunPlan, formatDryRunPlan } from './dry-run';
import { createMockRunner } from './mock-runner';
import type { Recipe } from './recipe';
import { defineTool, unsupported, type Tool, type Unsupported } from './tool';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    install: async () => {},
    uninstall: async () => {},
    isInstalled: async () => false,
    ...overrides,
  };
}

function tool(id: string, stage: 0 | 1 | 2 | 3, entry: Recipe | Unsupported = recipe()): Tool {
  return defineTool({ id, stage, tags: [], darwin: entry, linux: entry });
}

function lines(plan: Awaited<ReturnType<typeof buildDryRunPlan>>, platform: 'darwin' | 'linux', action: 'install' | 'uninstall') {
  return formatDryRunPlan(plan, platform, action);
}

describe('dry run (install)', () => {
  test('reports the exact install commands for a Tool that is not installed, without running them', async () => {
    const runner = createMockRunner();
    runner.failOn(['brew', 'list', '--cask', 'slack']);
    const slack = tool(
      'slack',
      3,
      recipe({
        install: async (r) => {
          await r.run(['brew', 'install', '--cask', 'slack']);
        },
        isInstalled: async (r) => (await r.run(['brew', 'list', '--cask', 'slack'])).exitCode === 0,
      }),
    );

    const plan = await buildDryRunPlan([slack], runner, 'darwin', 'install');

    expect(lines(plan, 'darwin', 'install')).toEqual(['→ slack: brew install --cask slack']);
    expect(runner.wasRun(['brew', 'list', '--cask', 'slack'])).toBe(true);
    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(false);
  });

  test('reports an already-installed Tool without recording any command for it', async () => {
    const git = tool('git', 3, recipe({ isInstalled: async () => true }));

    const plan = await buildDryRunPlan([git], createMockRunner(), 'darwin', 'install');

    expect(plan).toEqual([{ status: 'nothing-to-do', id: 'git' }]);
    expect(lines(plan, 'darwin', 'install')).toEqual(['= git already installed, nothing to do']);
  });

  test('reports an unsupported Tool without touching the Runner at all', async () => {
    const runner = createMockRunner();
    const xcode = tool('xcode', 3, unsupported('Apple-only tool'));

    const plan = await buildDryRunPlan([xcode], runner, 'linux', 'install');

    expect(lines(plan, 'linux', 'install')).toEqual(['⊘ xcode not supported on linux: Apple-only tool']);
    expect(runner.commands).toEqual([]);
  });

  test('never sends an install command to the real Runner, even across several Tools', async () => {
    const runner = createMockRunner();
    const tools = [
      tool('flaky', 3, recipe({ install: async () => {} })),
      tool('mise', 1, recipe({ install: async () => {} })),
      tool('brew', 0, recipe({ install: async () => {} })),
    ];

    await buildDryRunPlan(tools, runner, 'darwin', 'install');

    expect(runner.commands).toEqual([]);
  });

  test('plans Tools in Stage order', async () => {
    const seen: string[] = [];
    const withId = (id: string, stage: 0 | 1 | 2 | 3) =>
      tool(
        id,
        stage,
        recipe({
          install: async () => {
            seen.push(id);
          },
        }),
      );

    await buildDryRunPlan([withId('slack', 3), withId('brew', 0), withId('mise', 1)], createMockRunner(), 'darwin', 'install');

    expect(seen).toEqual(['brew', 'mise', 'slack']);
  });
});

describe('dry run (uninstall)', () => {
  test('reports the exact uninstall commands for an installed Tool, without running them', async () => {
    const runner = createMockRunner();
    runner.respondTo(['brew', 'list', '--cask', 'slack'], { exitCode: 0 });
    const slack = tool(
      'slack',
      3,
      recipe({
        isInstalled: async (r) => (await r.run(['brew', 'list', '--cask', 'slack'])).exitCode === 0,
        uninstall: async (r) => {
          await r.run(['brew', 'uninstall', '--cask', 'slack']);
        },
      }),
    );

    const plan = await buildDryRunPlan([slack], runner, 'darwin', 'uninstall');

    expect(lines(plan, 'darwin', 'uninstall')).toEqual(['→ slack: brew uninstall --cask slack']);
    expect(runner.wasRun(['brew', 'list', '--cask', 'slack'])).toBe(true);
    expect(runner.wasRun(['brew', 'uninstall', '--cask', 'slack'])).toBe(false);
  });

  test('reports a not-installed Tool without recording any command for it', async () => {
    const git = tool('git', 3, recipe({ isInstalled: async () => false }));

    const plan = await buildDryRunPlan([git], createMockRunner(), 'darwin', 'uninstall');

    expect(lines(plan, 'darwin', 'uninstall')).toEqual(['= git not installed, nothing to do']);
  });

  test('reports an unsupported Tool without touching the Runner at all', async () => {
    const runner = createMockRunner();
    const xcode = tool('xcode', 3, unsupported('Apple-only tool'));

    const plan = await buildDryRunPlan([xcode], runner, 'linux', 'uninstall');

    expect(lines(plan, 'linux', 'uninstall')).toEqual(['⊘ xcode not supported on linux: Apple-only tool']);
    expect(runner.commands).toEqual([]);
  });

  test('never sends an uninstall command to the real Runner, even across several Tools', async () => {
    const runner = createMockRunner();
    const tools = [
      tool('flaky', 3, recipe({ isInstalled: async () => true })),
      tool('mise', 1, recipe({ isInstalled: async () => true })),
      tool('brew', 0, recipe({ isInstalled: async () => true })),
    ];

    await buildDryRunPlan(tools, runner, 'darwin', 'uninstall');

    expect(runner.commands).toEqual([]);
  });

  test('plans Tools in reverse Stage order', async () => {
    const seen: string[] = [];
    const withId = (id: string, stage: 0 | 1 | 2 | 3) =>
      tool(
        id,
        stage,
        recipe({
          isInstalled: async () => true,
          uninstall: async () => {
            seen.push(id);
          },
        }),
      );

    await buildDryRunPlan([withId('brew', 0), withId('mise', 1), withId('slack', 3)], createMockRunner(), 'darwin', 'uninstall');

    expect(seen).toEqual(['slack', 'mise', 'brew']);
  });
});

describe('dry run (configuration)', () => {
  const home = homedir();
  const configuration = { root: home, files: [{ path: '.zshrc', content: 'managed\n' }] };
  const zshrcMatches = ['sh', '-c', 'printf "%s" "$1" | cmp -s - "$2"', 'sh', 'managed\n', `${home}/.zshrc`];

  function configuredTool(entry: Recipe): Tool {
    return defineTool({ id: 'zsh', stage: 3, tags: [], darwin: entry, linux: entry, configuration });
  }

  test('lists the files an already-installed Tool would rewrite, without writing them', async () => {
    const runner = createMockRunner();
    runner.failOn(zshrcMatches);
    const zsh = configuredTool(recipe({ isInstalled: async () => true }));

    const plan = await buildDryRunPlan([zsh], runner, 'darwin', 'install');

    expect(lines(plan, 'darwin', 'install')).toEqual(['✎ zsh: writes ~/.zshrc']);
    expect(runner.commands).toEqual([zshrcMatches]);
  });

  test('lists the install commands first, then the files, for a Tool that is missing', async () => {
    const runner = createMockRunner();
    runner.failOn(zshrcMatches);
    const zsh = configuredTool(
      recipe({
        install: async (r) => {
          await r.run(['brew', 'install', 'zsh']);
        },
      }),
    );

    const plan = await buildDryRunPlan([zsh], runner, 'darwin', 'install');

    expect(lines(plan, 'darwin', 'install')).toEqual(['→ zsh: brew install zsh\n✎ zsh: writes ~/.zshrc']);
  });

  test('reports nothing to do when the Tool is installed and its files already match', async () => {
    const zsh = configuredTool(recipe({ isInstalled: async () => true }));

    const plan = await buildDryRunPlan([zsh], createMockRunner(), 'darwin', 'install');

    expect(plan).toEqual([{ status: 'nothing-to-do', id: 'zsh' }]);
  });

  test('never plans configuration on uninstall', async () => {
    const runner = createMockRunner();
    const zsh = configuredTool(recipe({ isInstalled: async () => false }));

    const plan = await buildDryRunPlan([zsh], runner, 'darwin', 'uninstall');

    expect(plan).toEqual([{ status: 'nothing-to-do', id: 'zsh' }]);
    expect(runner.commands).toEqual([]);
  });
});
