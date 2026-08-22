import { runCommand } from 'citty';
import { describe, expect, spyOn, test } from 'bun:test';
import { brewCask } from '../../helpers/brew-cask';
import { MockReporter } from '../../reporter/mock-reporter';
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

function tool(id: string, stage: 0 | 1 | 2 | 3, entry: Recipe | Unsupported = recipe(), tags: string[] = []): Tool {
  return defineTool({ id, stage, tags, darwin: entry, linux: entry });
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
    expect(process.exitCode).not.toBe(0);
    // `run()` sets process.exitCode for the real CLI process; undo it here so
    // it doesn't leak into `bun test`'s own exit code.
    process.exitCode = 0;
  });

  test('resolves the darwin recipe on darwin and the linux recipe on linux for the same Tool', async () => {
    const runner = new MockRunner();
    const tool = defineTool({
      id: 'slack',
      stage: 3,
      tags: [],
      darwin: brewCask('slack'),
      linux: unsupported('não usado neste teste'),
    });
    runner.failOn(['brew', 'list', '--cask', 'slack']);

    await runCommand(createInstallCommand(runner, 'darwin', { lookupTool: () => tool }), { rawArgs: ['slack'] });

    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(true);
  });

  test('reports ⊘ and the reason for an unsupported tool, without touching the Runner or counting it as a failure', async () => {
    const runner = new MockRunner();
    const tool = defineTool({
      id: 'xcode',
      stage: 3,
      tags: [],
      darwin: brewCask('xcode'),
      linux: unsupported('ferramenta exclusiva da Apple'),
    });
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = 0;

    await runCommand(createInstallCommand(runner, 'linux', { lookupTool: () => tool }), { rawArgs: ['xcode'] });

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

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', { lookupCatalog: () => catalog }), {
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

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', { lookupCatalog: () => catalog }), {
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

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', { lookupCatalog: () => catalog }), {
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

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', { lookupCatalog: () => catalog }), {
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

    await runCommand(createInstallCommand(runner, 'darwin', { lookupCatalog: catalog }), { rawArgs: [] });
    expect(installedIds).toEqual(new Set(['brew']));

    await runCommand(createInstallCommand(runner, 'darwin', { lookupCatalog: catalog }), { rawArgs: [] });

    expect(installedIds).toEqual(new Set(['brew', 'flaky']));
    expect(brewInstallCalls).toBe(1);
    expect(flakyInstallCalls).toBe(2);
    process.exitCode = 0;
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('installs exactly the named tools, in Stage order rather than argument order', async () => {
    const order: string[] = [];
    const install = (id: string) => async () => {
      order.push(id);
    };
    const neovim = tool('neovim', 2, recipe({ install: install('neovim') }));
    const docker = tool('docker', 3, recipe({ install: install('docker') }));
    const slack = tool('slack', 3, recipe({ install: install('slack') }));
    const findTool = (id: string) => [neovim, docker, slack].find((t) => t.id === id);
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', { lookupTool: findTool }), {
      rawArgs: ['docker', 'neovim'],
    });

    expect(order).toEqual(['neovim', 'docker']);
    logSpy.mockRestore();
  });

  test('an unknown name among several fails the whole run and installs nothing', async () => {
    const installed: string[] = [];
    const neovim = tool('neovim', 2, recipe({ install: async () => { installed.push('neovim'); } }));
    const findTool = (id: string) => (id === 'neovim' ? neovim : undefined);
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', { lookupTool: findTool }), {
      rawArgs: ['neovim', 'not-a-real-tool'],
    });

    expect(installed).toEqual([]);
    expect(process.exitCode).not.toBe(0);
    process.exitCode = 0;
    errorSpy.mockRestore();
  });

  test('--tag installs exactly the Tools carrying that Tag', async () => {
    const installed: string[] = [];
    const catalogWithTags = [
      tool('slack', 3, recipe({ install: async () => { installed.push('slack'); } }), ['apps']),
      tool('neovim', 2, recipe({ install: async () => { installed.push('neovim'); } }), ['cli']),
      tool('bun', 1, recipe({ install: async () => { installed.push('bun'); } }), ['runtimes']),
    ];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(
      createInstallCommand(new MockRunner(), 'darwin', { lookupCatalog: () => catalogWithTags }),
      { rawArgs: ['--tag', 'cli'] },
    );

    expect(installed).toEqual(['neovim']);
    logSpy.mockRestore();
  });

  test('--interactive installs exactly the Tools marked in the multiselect', async () => {
    const installed: string[] = [];
    const catalogForPrompt = [
      tool('slack', 3, recipe({ install: async () => { installed.push('slack'); } })),
      tool('neovim', 2, recipe({ install: async () => { installed.push('neovim'); } })),
    ];
    const promptForTools = async (offered: readonly Tool[]) => offered.filter((t) => t.id === 'neovim');
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(
      createInstallCommand(new MockRunner(), 'darwin', { lookupCatalog: () => catalogForPrompt, promptForTools }),
      { rawArgs: ['--interactive'] },
    );

    expect(installed).toEqual(['neovim']);
    logSpy.mockRestore();
  });

  test('without --interactive, the prompt is never invoked', async () => {
    let promptCalled = false;
    const promptForTools = async (offered: readonly Tool[]) => {
      promptCalled = true;
      return offered;
    };
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(
      createInstallCommand(new MockRunner(), 'darwin', { promptForTools }),
      { rawArgs: ['slack'] },
    );

    expect(promptCalled).toBe(false);
    logSpy.mockRestore();
  });

  test('--dry-run prints exactly what would run and sends no write command to the Runner', async () => {
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

    await runCommand(createInstallCommand(runner, 'darwin', { lookupTool: () => slack }), {
      rawArgs: ['slack', '--dry-run'],
    });

    expect(logSpy.mock.calls.flat()).toEqual(['→ slack: brew install --cask slack']);
    expect(runner.wasRun(['brew', 'list', '--cask', 'slack'])).toBe(true);
    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(false);

    logSpy.mockRestore();
  });

  test('--dry-run on an unknown name still fails, without printing a dry-run plan', async () => {
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    const runner = new MockRunner();

    await runCommand(createInstallCommand(runner, 'darwin'), {
      rawArgs: ['not-a-real-tool', '--dry-run'],
    });

    expect(runner.commands).toEqual([]);
    expect(process.exitCode).not.toBe(0);
    process.exitCode = 0;
    errorSpy.mockRestore();
  });
});

describe('install command, as reported', () => {
  test("opens each Tool's line before its command runs, and closes it with the Outcome", async () => {
    const reporter = new MockReporter();
    const openWhileInstalling: string[] = [];
    const catalog = [
      tool(
        'brew',
        0,
        recipe({
          install: async () => {
            openWhileInstalling.push(...reporter.messages('task'));
          },
        }),
      ),
    ];

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', { lookupCatalog: () => catalog, reporter }), {
      rawArgs: [],
    });

    // The line is already open while `install()` runs — that is the whole
    // point of reporting before the command instead of after it.
    expect(openWhileInstalling).toEqual(['Instalando brew']);
    expect(reporter.messages('task', 'succeed')).toEqual(['Instalando brew', 'brew instalado']);
  });

  test('closes each line under the kind its Outcome deserves', async () => {
    const reporter = new MockReporter();
    const catalog = [
      tool('git', 0, recipe({ isInstalled: async () => true })),
      tool('slack', 3, recipe()),
      tool('xcode', 3, unsupported('ferramenta exclusiva da Apple')),
      tool(
        'docker',
        3,
        recipe({
          install: async () => {
            throw new Error('curl falhou');
          },
        }),
      ),
    ];

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', { lookupCatalog: () => catalog, reporter }), {
      rawArgs: [],
    });

    expect(reporter.messages('succeed')).toEqual(['git já estava instalado', 'slack instalado']);
    expect(reporter.messages('skip')).toEqual(['xcode não suportado em darwin: ferramenta exclusiva da Apple']);
    expect(reporter.messages('fail')).toEqual(['docker falhou: curl falhou']);

    process.exitCode = 0;
  });

  test('files the closing summary under its own title and signs off', async () => {
    const reporter = new MockReporter();

    await runCommand(
      createInstallCommand(new MockRunner(), 'darwin', { lookupCatalog: () => [tool('slack', 3, recipe())], reporter }),
      { rawArgs: [] },
    );

    expect(reporter.messages('block')).toEqual(['Resumo:\n  instalados: 1\n  já instalados: 0\n  não suportados: 0\n  falharam: 0']);
    expect(reporter.messages('outro')).toEqual(['Tudo pronto.']);
  });

  test('a filtered run reports its Tools and skips the summary block', async () => {
    const reporter = new MockReporter();
    const slack = tool('slack', 3, recipe());

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', { lookupTool: () => slack, reporter }), {
      rawArgs: ['slack'],
    });

    expect(reporter.messages('succeed')).toEqual(['slack instalado']);
    expect(reporter.messages('block')).toEqual([]);
  });

  test('an unknown name is reported as an error, and never opens a Tool line', async () => {
    const reporter = new MockReporter();

    await runCommand(createInstallCommand(new MockRunner(), 'darwin', { reporter }), {
      rawArgs: ['not-a-real-tool'],
    });

    expect(reporter.messages('error')).toHaveLength(1);
    expect(reporter.messages('task')).toEqual([]);

    process.exitCode = 0;
  });
});
