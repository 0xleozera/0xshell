import { describe, expect, spyOn, test } from 'bun:test';
import { MockRunner } from '../../runner/mock-runner';
import { defineTool, type Tool } from '../../tool/define-tool';
import type { Recipe } from '../../tool/recipe';
import { unsupported, type Unsupported } from '../../tool/unsupported';
import { runDryRun } from './dry-run';

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

describe('runDryRun', () => {
  test('prints the exact install commands for a Tool that is not installed, without running them', async () => {
    const runner = new MockRunner();
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
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runDryRun([slack], runner, 'darwin');

    expect(logSpy.mock.calls.flat()).toEqual(['→ slack: brew install --cask slack']);
    expect(runner.wasRun(['brew', 'list', '--cask', 'slack'])).toBe(true);
    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(false);

    logSpy.mockRestore();
  });

  test('reports an already-installed Tool without recording any command for it', async () => {
    const runner = new MockRunner();
    const git = tool('git', 3, recipe({ isInstalled: async () => true }));
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runDryRun([git], runner, 'darwin');

    expect(logSpy.mock.calls.flat()).toEqual(['= git já instalado, nada a fazer']);

    logSpy.mockRestore();
  });

  test('reports an unsupported Tool without touching the Runner at all', async () => {
    const runner = new MockRunner();
    const xcode = tool('xcode', 3, unsupported('ferramenta exclusiva da Apple'));
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runDryRun([xcode], runner, 'linux');

    expect(logSpy.mock.calls.flat()).toEqual(['⊘ xcode não suportado em linux: ferramenta exclusiva da Apple']);
    expect(runner.commands).toEqual([]);

    logSpy.mockRestore();
  });

  test('never sends an install/uninstall command to the real Runner, even across several Tools', async () => {
    const runner = new MockRunner();
    const tools = [
      tool('flaky', 3, recipe({ install: async () => {} })),
      tool('mise', 1, recipe({ install: async () => {} })),
      tool('brew', 0, recipe({ install: async () => {} })),
    ];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runDryRun(tools, runner, 'darwin');

    expect(runner.commands).toEqual([]);

    logSpy.mockRestore();
  });

  test('prints Tools in Stage order', async () => {
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
    const tools = [withId('slack', 3), withId('brew', 0), withId('mise', 1)];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runDryRun(tools, new MockRunner(), 'darwin');

    expect(seen).toEqual(['brew', 'mise', 'slack']);

    logSpy.mockRestore();
  });
});
