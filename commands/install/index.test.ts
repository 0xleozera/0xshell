import { runCommand } from 'citty';
import { describe, expect, spyOn, test } from 'bun:test';
import { brewCask } from '../../helpers/brew-cask';
import { MockRunner } from '../../runner/mock-runner';
import { defineTool, type Tool } from '../../tool/define-tool';
import type { Recipe } from '../../tool/recipe';
import { unsupported, type Unsupported } from '../../tool/unsupported';
import { createInstallCommand } from './index';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    install: async () => {},
    uninstall: async () => {},
    isInstalled: async () => false,
    ...overrides,
  };
}

function tool(id: string, stage: 0 | 1 | 2 | 3, entry: Recipe | Unsupported = recipe()): Tool {
  return defineTool({ id, stage, darwin: entry, linux: entry });
}

describe('install command', () => {
  test('installs the tool when it is not already installed', async () => {
    const runner = new MockRunner();
    runner.failOn(['brew', 'list', '--cask', 'slack']);

    await runCommand(createInstallCommand(runner, 'darwin'), { rawArgs: ['slack'] });

    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(true);
  });

  test('does not run the install command when already installed', async () => {
    const runner = new MockRunner();
    runner.respondTo(['brew', 'list', '--cask', 'slack'], { exitCode: 0 });

    await runCommand(createInstallCommand(runner, 'darwin'), { rawArgs: ['slack'] });

    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(false);
  });

  test('reports an unknown tool without touching the Runner', async () => {
    const runner = new MockRunner();

    await runCommand(createInstallCommand(runner, 'darwin'), { rawArgs: ['not-a-real-tool'] });

    expect(runner.commands).toEqual([]);
    // `run()` sets process.exitCode for the real CLI process; undo it here so
    // it doesn't leak into `bun test`'s own exit code.
    process.exitCode = 0;
  });

  test('resolves the darwin recipe on darwin and the linux recipe on linux for the same Tool', async () => {
    const runner = new MockRunner();
    const tool = defineTool({
      id: 'slack',
      stage: 3,
      darwin: brewCask('slack'),
      linux: unsupported('não usado neste teste'),
    });
    runner.failOn(['brew', 'list', '--cask', 'slack']);

    await runCommand(createInstallCommand(runner, 'darwin', () => tool), { rawArgs: ['slack'] });

    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(true);
  });

  test('reports ⊘ and the reason for an unsupported tool, without touching the Runner or counting it as a failure', async () => {
    const runner = new MockRunner();
    const tool = defineTool({
      id: 'xcode',
      stage: 3,
      darwin: brewCask('xcode'),
      linux: unsupported('ferramenta exclusiva da Apple'),
    });
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = 0;

    await runCommand(createInstallCommand(runner, 'linux', () => tool), { rawArgs: ['xcode'] });

    expect(runner.commands).toEqual([]);
    expect(logSpy.mock.calls.flat()).toEqual([
      '⊘ xcode não suportado em linux: ferramenta exclusiva da Apple',
    ]);
    expect(process.exitCode).toBe(0);

    logSpy.mockRestore();
  });

  test('without a tool argument, installs the whole catalog in Stage order', async () => {
    const order: string[] = [];
    const install = (id: string) => async () => {
      order.push(id);
    };
    const catalog = [
      tool('slack', 3, recipe({ install: install('slack') })),
      tool('brew', 0, recipe({ install: install('brew') })),
      tool('mise', 1, recipe({ install: install('mise') })),
    ];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', undefined, () => catalog), {
      rawArgs: [],
    });

    expect(order).toEqual(['brew', 'mise', 'slack']);
    logSpy.mockRestore();
  });

  test('a Stage 0 failure aborts the run and the summary shows zero exit-eligible successes after it', async () => {
    const catalog = [
      tool(
        'brew',
        0,
        recipe({
          install: async () => {
            throw new Error('curl falhou');
          },
        }),
      ),
      tool('slack', 3, recipe()),
    ];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', undefined, () => catalog), {
      rawArgs: [],
    });

    expect(errorSpy.mock.calls.flat()).toEqual(['✗ brew falhou: curl falhou']);
    const summary = logSpy.mock.calls.flat().join('\n');
    expect(summary).toContain('instalados: 0');
    expect(summary).toContain('falharam: 1');
    expect(process.exitCode).not.toBe(0);

    process.exitCode = 0;
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('a failure outside Stage 0 is collected, later Tools still run, and the exit code is non-zero', async () => {
    const catalog = [
      tool('brew', 0, recipe()),
      tool(
        'flaky',
        3,
        recipe({
          install: async () => {
            throw new Error('network unreachable');
          },
        }),
      ),
      tool('slack', 3, recipe()),
    ];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', undefined, () => catalog), {
      rawArgs: [],
    });

    const summary = logSpy.mock.calls.flat().join('\n');
    expect(summary).toContain('instalados: 2');
    expect(summary).toContain('falharam: 1');
    expect(summary).toContain('flaky: network unreachable');
    expect(process.exitCode).not.toBe(0);

    process.exitCode = 0;
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('the exit code is zero when the run has only successes, already-installed and unsupported Tools', async () => {
    const catalog = [
      tool('brew', 0, recipe()),
      tool('git', 3, recipe({ isInstalled: async () => true })),
      tool('xcode', 3, unsupported('ferramenta exclusiva da Apple')),
    ];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', undefined, () => catalog), {
      rawArgs: [],
    });

    expect(process.exitCode).toBe(0);
    logSpy.mockRestore();
  });

  test('re-running after a partial failure only reinstalls what is still missing', async () => {
    const installedIds = new Set<string>();
    let flakyInstallCalls = 0;
    let brewInstallCalls = 0;
    const catalog = () => [
      tool(
        'brew',
        0,
        recipe({
          isInstalled: async () => installedIds.has('brew'),
          install: async () => {
            brewInstallCalls++;
            installedIds.add('brew');
          },
        }),
      ),
      tool(
        'flaky',
        3,
        recipe({
          isInstalled: async () => installedIds.has('flaky'),
          install: async () => {
            flakyInstallCalls++;
            if (flakyInstallCalls === 1) {
              throw new Error('network unreachable');
            }
            installedIds.add('flaky');
          },
        }),
      ),
    ];
    const runner = new MockRunner();
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

    await runCommand(createInstallCommand(runner, 'darwin', undefined, catalog), { rawArgs: [] });
    expect(installedIds).toEqual(new Set(['brew']));

    await runCommand(createInstallCommand(runner, 'darwin', undefined, catalog), { rawArgs: [] });

    expect(installedIds).toEqual(new Set(['brew', 'flaky']));
    expect(brewInstallCalls).toBe(1);
    expect(flakyInstallCalls).toBe(2);
    process.exitCode = 0;
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
