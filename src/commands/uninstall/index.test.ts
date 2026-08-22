import { runCommand } from 'citty';
import { describe, expect, spyOn, test } from 'bun:test';
import { apt } from '../../helpers/apt';
import { brewCask } from '../../helpers/brew-cask';
import { MockReporter } from '../../reporter/mock-reporter';
import { MockRunner } from '../../runner/mock-runner';
import { defineTool, type Tool } from '../../tool/define-tool';
import type { Recipe } from '../../tool/recipe';
import { unsupported, type Unsupported } from '../../tool/unsupported';
import { createUninstallCommand } from './index';

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    install: async () => {},
    uninstall: async () => {},
    isInstalled: async () => true,
    ...overrides,
  };
}

function tool(id: string, stage: 0 | 1 | 2 | 3, entry: Recipe | Unsupported = recipe(), tags: string[] = []): Tool {
  return defineTool({ id, stage, tags, darwin: entry, linux: entry });
}

const HOMEBREW_WARNING = 'Aviso: desinstalar o Homebrew (Stage 0) leva junto tudo que ele instalou.';
const MISE_WARNING = 'Aviso: desinstalar o mise (Stage 1) leva junto bun, pnpm, yarn, go, node e neovim.';

describe('uninstall command', () => {
  test('uninstalls the named tools', async () => {
    const uninstalled: string[] = [];
    const slack = tool(
      'slack',
      3,
      recipe({
        uninstall: async () => {
          uninstalled.push('slack');
        },
      }),
    );

    await runCommand(createUninstallCommand(new MockRunner(), 'darwin', { lookupTool: () => slack }), { rawArgs: ['slack'] });

    expect(uninstalled).toEqual(['slack']);
  });

  test('uninstalling something already not installed reports it and continues, without failing', async () => {
    const runner = new MockRunner();
    const git = tool('git', 3, recipe({ isInstalled: async () => false }));
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(createUninstallCommand(runner, 'darwin', { lookupTool: () => git }), { rawArgs: ['git'] });

    expect(logSpy.mock.calls.flat()).toContain('✓ git não estava instalado');
    expect(process.exitCode).toBe(0);

    logSpy.mockRestore();
  });

  describe('guarda-corpo 1: sem argumento é erro', () => {
    test('nothing reaches the Runner and the exit code is non-zero', async () => {
      const runner = new MockRunner();
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

      await runCommand(createUninstallCommand(runner, 'darwin'), { rawArgs: [] });

      expect(runner.commands).toEqual([]);
      expect(process.exitCode).not.toBe(0);

      process.exitCode = 0;
      errorSpy.mockRestore();
    });
  });

  describe('guarda-corpo 2: --all exige confirmação interativa', () => {
    test('without confirmation, nothing executes', async () => {
      const uninstalled: string[] = [];
      const catalog = [
        tool(
          'slack',
          3,
          recipe({
            uninstall: async () => {
              uninstalled.push('slack');
            },
          }),
        ),
      ];
      const confirmAllPrompt = async () => false;

      await runCommand(
        createUninstallCommand(new MockRunner(), 'darwin', { lookupCatalog: () => catalog, confirmAllPrompt }),
        { rawArgs: ['--all'] },
      );

      expect(uninstalled).toEqual([]);
    });

    test('confirmed, uninstalls the whole catalog (minus Stage 0/1)', async () => {
      const uninstalled: string[] = [];
      const remove = (id: string) => async () => {
        uninstalled.push(id);
      };
      const catalog = [
        tool('homebrew', 0, recipe({ uninstall: remove('homebrew') })),
        tool('mise', 1, recipe({ uninstall: remove('mise') })),
        tool('runtime', 2, recipe({ uninstall: remove('runtime') })),
        tool('slack', 3, recipe({ uninstall: remove('slack') })),
      ];
      const confirmAllPrompt = async () => true;
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});

      await runCommand(
        createUninstallCommand(new MockRunner(), 'darwin', { lookupCatalog: () => catalog, confirmAllPrompt }),
        { rawArgs: ['--all'] },
      );

      expect(uninstalled).toEqual(['slack', 'runtime']);

      logSpy.mockRestore();
    });

    test('the closing Resumo uses uninstall vocabulary, not install\'s', async () => {
      const catalog = [tool('slack', 3, recipe()), tool('xcode', 3, unsupported('ferramenta exclusiva da Apple'))];
      const confirmAllPrompt = async () => true;
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});

      await runCommand(
        createUninstallCommand(new MockRunner(), 'darwin', { lookupCatalog: () => catalog, confirmAllPrompt }),
        { rawArgs: ['--all'] },
      );

      const summary = logSpy.mock.calls.flat().join('\n');
      expect(summary).toContain('desinstalados: 1');
      expect(summary).not.toContain('\n  instalados:');
      expect(summary).not.toContain('\n  já instalados:');

      logSpy.mockRestore();
    });
  });

  describe('guarda-corpo 3: homebrew e mise nunca são alcançados por --all ou --tag', () => {
    test('--tag skips Stage 0 and Stage 1 Tools even when they carry the Tag', async () => {
      const uninstalled: string[] = [];
      const remove = (id: string) => async () => {
        uninstalled.push(id);
      };
      const catalog = [
        tool('homebrew', 0, recipe({ uninstall: remove('homebrew') }), ['core']),
        tool('mise', 1, recipe({ uninstall: remove('mise') }), ['core']),
        tool('slack', 3, recipe({ uninstall: remove('slack') }), ['core']),
      ];
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});

      await runCommand(createUninstallCommand(new MockRunner(), 'darwin', { lookupCatalog: () => catalog }), {
        rawArgs: ['--tag', 'core'],
      });

      expect(uninstalled).toEqual(['slack']);

      logSpy.mockRestore();
    });

    test('naming homebrew and mise explicitly uninstalls them, preceded by the consequence warning', async () => {
      const uninstalled: string[] = [];
      const homebrew = tool(
        'homebrew',
        0,
        recipe({
          uninstall: async () => {
            uninstalled.push('homebrew');
          },
        }),
      );
      const mise = tool(
        'mise',
        1,
        recipe({
          uninstall: async () => {
            uninstalled.push('mise');
          },
        }),
      );
      const findTool = (id: string) => [homebrew, mise].find((t) => t.id === id);
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});

      await runCommand(createUninstallCommand(new MockRunner(), 'darwin', { lookupTool: findTool }), {
        rawArgs: ['homebrew', 'mise'],
      });

      expect(uninstalled).toEqual(['mise', 'homebrew']);
      const logs = logSpy.mock.calls.flat();
      expect(logs).toContain(HOMEBREW_WARNING);
      expect(logs).toContain(MISE_WARNING);

      logSpy.mockRestore();
    });
  });

  describe('guarda-corpo 4: execução na ordem inversa dos Stages', () => {
    test('executes Stage 3 → 2 → 1 → 0, regardless of argument order', async () => {
      const order: string[] = [];
      const remove = (id: string) => async () => {
        order.push(id);
      };
      const app = tool('app', 3, recipe({ uninstall: remove('app') }));
      const runtime = tool('runtime', 2, recipe({ uninstall: remove('runtime') }));
      const mise = tool('mise', 1, recipe({ uninstall: remove('mise') }));
      const homebrew = tool('homebrew', 0, recipe({ uninstall: remove('homebrew') }));
      const findTool = (id: string) => [app, runtime, mise, homebrew].find((t) => t.id === id);
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});

      await runCommand(createUninstallCommand(new MockRunner(), 'darwin', { lookupTool: findTool }), {
        rawArgs: ['runtime', 'homebrew', 'app', 'mise'],
      });

      expect(order).toEqual(['app', 'runtime', 'mise', 'homebrew']);

      logSpy.mockRestore();
    });
  });

  describe('guarda-corpo: nenhum comando de purga é produzido', () => {
    test('a brewCask (darwin) uninstall never sends --zap to the Runner', async () => {
      const runner = new MockRunner();
      const docker = defineTool({ id: 'docker', stage: 3, tags: [], darwin: brewCask('docker'), linux: apt('docker.io') });

      await runCommand(createUninstallCommand(runner, 'darwin', { lookupTool: () => docker }), { rawArgs: ['docker'] });

      expect(runner.wasRun(['brew', 'uninstall', '--cask', 'docker'])).toBe(true);
      expect(
        runner.commands.some((command) => command.some((arg) => arg.includes('purge') || arg.includes('--zap'))),
      ).toBe(false);
    });

    test('an apt (linux) uninstall runs "remove", never "purge"', async () => {
      const runner = new MockRunner();
      const docker = defineTool({ id: 'docker', stage: 3, tags: [], darwin: brewCask('docker'), linux: apt('docker.io') });

      await runCommand(createUninstallCommand(runner, 'linux', { lookupTool: () => docker }), { rawArgs: ['docker'] });

      expect(runner.wasRun(['sudo', 'apt', 'remove', '-y', 'docker.io'])).toBe(true);
      expect(
        runner.commands.some((command) => command.some((arg) => arg.includes('purge') || arg.includes('--zap'))),
      ).toBe(false);
    });
  });

  describe('--dry-run', () => {
    test('prints exactly what would be removed and sends no write command to the Runner', async () => {
      const runner = new MockRunner();
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
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});

      await runCommand(createUninstallCommand(runner, 'darwin', { lookupTool: () => slack }), {
        rawArgs: ['slack', '--dry-run'],
      });

      expect(logSpy.mock.calls.flat()).toEqual(['→ slack: brew uninstall --cask slack']);
      expect(runner.wasRun(['brew', 'list', '--cask', 'slack'])).toBe(true);
      expect(runner.wasRun(['brew', 'uninstall', '--cask', 'slack'])).toBe(false);

      logSpy.mockRestore();
    });

    test('--dry-run on an unknown name still fails, without printing a dry-run plan', async () => {
      const runner = new MockRunner();
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

      await runCommand(createUninstallCommand(runner, 'darwin', { lookupTool: () => undefined }), {
        rawArgs: ['not-a-real-tool', '--dry-run'],
      });

      expect(runner.commands).toEqual([]);
      expect(process.exitCode).not.toBe(0);

      process.exitCode = 0;
      errorSpy.mockRestore();
    });

    test('--all --dry-run never asks for confirmation, and still shows the plan', async () => {
      let promptCalled = false;
      const confirmAllPrompt = async () => {
        promptCalled = true;
        return true;
      };
      const runner = new MockRunner();
      const catalog = [
        tool(
          'slack',
          3,
          recipe({
            isInstalled: async () => true,
            uninstall: async (r) => {
              await r.run(['brew', 'uninstall', '--cask', 'slack']);
            },
          }),
        ),
      ];
      const logSpy = spyOn(console, 'log').mockImplementation(() => {});

      await runCommand(createUninstallCommand(runner, 'darwin', { lookupCatalog: () => catalog, confirmAllPrompt }), {
        rawArgs: ['--all', '--dry-run'],
      });

      expect(promptCalled).toBe(false);
      expect(logSpy.mock.calls.flat()).toEqual(['→ slack: brew uninstall --cask slack']);
      expect(runner.wasRun(['brew', 'uninstall', '--cask', 'slack'])).toBe(false);

      logSpy.mockRestore();
    });
  });

  test('an unknown name fails the whole run without touching the Runner', async () => {
    const runner = new MockRunner();
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

    await runCommand(createUninstallCommand(runner, 'darwin', { lookupTool: () => undefined }), {
      rawArgs: ['not-a-real-tool'],
    });

    expect(runner.commands).toEqual([]);
    expect(process.exitCode).not.toBe(0);

    process.exitCode = 0;
    errorSpy.mockRestore();
  });
});

describe('uninstall command, as reported', () => {
  test("opens each Tool's line before its command runs, in uninstall's own vocabulary", async () => {
    const reporter = new MockReporter();
    const catalog = [tool('slack', 3, recipe()), tool('docker', 3, recipe({ isInstalled: async () => false }))];

    await runCommand(
      createUninstallCommand(new MockRunner(), 'darwin', {
        lookupCatalog: () => catalog,
        confirmAllPrompt: async () => true,
        reporter,
      }),
      { rawArgs: ['--all'] },
    );

    expect(reporter.messages('task')).toEqual(['Desinstalando slack', 'Desinstalando docker']);
    expect(reporter.messages('succeed')).toEqual(['slack desinstalado', 'docker não estava instalado']);
    expect(reporter.messages('block')).toEqual([
      'Resumo:\n  desinstalados: 1\n  não estavam instalados: 1\n  não suportados: 0\n  falharam: 0',
    ]);
  });

  test('reports the guarded-Stage warning as a warning, before anything runs', async () => {
    const reporter = new MockReporter();
    const homebrew = tool('homebrew', 0, recipe());

    await runCommand(
      createUninstallCommand(new MockRunner(), 'darwin', { lookupTool: () => homebrew, reporter }),
      { rawArgs: ['homebrew'] },
    );

    expect(reporter.messages('warn')).toEqual([HOMEBREW_WARNING]);
    expect(reporter.reports.findIndex((r) => r.kind === 'warn')).toBeLessThan(
      reporter.reports.findIndex((r) => r.kind === 'task'),
    );
  });

  test('a bare uninstall is reported as an error, and never opens a run', async () => {
    const reporter = new MockReporter();

    await runCommand(createUninstallCommand(new MockRunner(), 'darwin', { reporter }), { rawArgs: [] });

    expect(reporter.messages('error')).toHaveLength(1);
    expect(reporter.messages('intro')).toEqual([]);

    process.exitCode = 0;
  });
});
