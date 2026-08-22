import { describe, expect, test } from 'bun:test';
import type { CliContext, CliPrompts } from '../lib/context';
import { CliError } from '../lib/errors';
import { apt } from '../lib/helpers/apt';
import { brewCask } from '../lib/helpers/brew-cask';
import { createMockReporter, type MockReporter } from '../lib/mock-reporter';
import { createMockRunner, type MockRunner } from '../lib/mock-runner';
import type { Recipe } from '../lib/recipe';
import { defineTool, unsupported, type Tool, type Unsupported } from '../lib/tool';
import type { UninstallInput } from '../schemas/commands';
import { formatUninstallSummary, uninstallCommand } from './uninstall';

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

/** No test may reach a prompt it did not ask for: every one of them hangs a script. */
const noPrompts: CliPrompts = {
  askToolsToInstall: async () => {
    throw new Error('the prompt should not have been opened');
  },
  confirmUninstallAll: async () => {
    throw new Error('the prompt should not have been opened');
  },
};

const confirming: CliPrompts = { ...noPrompts, confirmUninstallAll: async () => true };

type TestContext = CliContext & { readonly runner: MockRunner; readonly reporter: MockReporter };

function context(overrides: Partial<CliContext> = {}): TestContext {
  return {
    runner: createMockRunner(),
    reporter: createMockReporter(),
    platform: 'darwin',
    catalog: [],
    prompts: noPrompts,
    ...overrides,
  } as TestContext;
}

function input(overrides: Partial<UninstallInput> = {}): UninstallInput {
  return { tools: [], all: false, dryRun: false, ...overrides };
}

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

    await uninstallCommand(input({ tools: ['slack'] }), context({ catalog: [slack] }));

    expect(uninstalled).toEqual(['slack']);
  });

  test('uninstalling something already not installed reports it and continues, without failing', async () => {
    const git = tool('git', 3, recipe({ isInstalled: async () => false }));
    const ctx = context({ catalog: [git] });

    const result = await uninstallCommand(input({ tools: ['git'] }), ctx);

    expect(ctx.reporter.messages('succeed')).toEqual(['git não estava instalado']);
    expect(result).toMatchObject({ summary: { failed: 0 } });
  });

  describe('guarda-corpo 1: sem argumento é erro', () => {
    test('nothing reaches the Runner and the run is refused as a usage error', async () => {
      const ctx = context();

      const rejected = uninstallCommand(input(), ctx);

      await expect(rejected).rejects.toThrow(CliError);
      await expect(rejected).rejects.toThrow('nada é assumido por padrão');
      expect(ctx.runner.commands).toEqual([]);
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
      const prompts: CliPrompts = { ...noPrompts, confirmUninstallAll: async () => false };

      await uninstallCommand(input({ all: true }), context({ catalog, prompts }));

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

      await uninstallCommand(input({ all: true }), context({ catalog, prompts: confirming }));

      expect(uninstalled).toEqual(['slack', 'runtime']);
    });

    test("the closing Resumo uses uninstall vocabulary, not install's", async () => {
      const catalog = [tool('slack', 3, recipe()), tool('xcode', 3, unsupported('ferramenta exclusiva da Apple'))];
      const ctx = context({ catalog, prompts: confirming });

      await uninstallCommand(input({ all: true }), ctx);

      const summary = ctx.reporter.messages('block').join('\n');
      expect(summary).toContain('desinstalados: 1');
      expect(summary).not.toContain('\n  instalados:');
      expect(summary).not.toContain('\n  já instalados:');
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

      await uninstallCommand(input({ tag: 'core' }), context({ catalog }));

      expect(uninstalled).toEqual(['slack']);
    });

    test('naming homebrew and mise explicitly uninstalls them, preceded by the consequence warning', async () => {
      const uninstalled: string[] = [];
      const remove = (id: string) => async () => {
        uninstalled.push(id);
      };
      const catalog = [
        tool('homebrew', 0, recipe({ uninstall: remove('homebrew') })),
        tool('mise', 1, recipe({ uninstall: remove('mise') })),
      ];
      const ctx = context({ catalog });

      await uninstallCommand(input({ tools: ['homebrew', 'mise'] }), ctx);

      expect(uninstalled).toEqual(['mise', 'homebrew']);
      expect(ctx.reporter.messages('warn')).toContain(HOMEBREW_WARNING);
      expect(ctx.reporter.messages('warn')).toContain(MISE_WARNING);
    });
  });

  describe('guarda-corpo 4: execução na ordem inversa dos Stages', () => {
    test('executes Stage 3 → 2 → 1 → 0, regardless of argument order', async () => {
      const order: string[] = [];
      const remove = (id: string) => async () => {
        order.push(id);
      };
      const catalog = [
        tool('app', 3, recipe({ uninstall: remove('app') })),
        tool('runtime', 2, recipe({ uninstall: remove('runtime') })),
        tool('mise', 1, recipe({ uninstall: remove('mise') })),
        tool('homebrew', 0, recipe({ uninstall: remove('homebrew') })),
      ];

      await uninstallCommand(input({ tools: ['runtime', 'homebrew', 'app', 'mise'] }), context({ catalog }));

      expect(order).toEqual(['app', 'runtime', 'mise', 'homebrew']);
    });
  });

  describe('guarda-corpo: nenhum comando de purga é produzido', () => {
    const docker = defineTool({
      id: 'docker',
      stage: 3,
      tags: [],
      darwin: brewCask('docker'),
      linux: apt('docker.io'),
    });

    test('a brewCask (darwin) uninstall never sends --zap to the Runner', async () => {
      const ctx = context({ catalog: [docker] });

      await uninstallCommand(input({ tools: ['docker'] }), ctx);

      expect(ctx.runner.wasRun(['brew', 'uninstall', '--cask', 'docker'])).toBe(true);
      expect(
        ctx.runner.commands.some((command) => command.some((arg) => arg.includes('purge') || arg.includes('--zap'))),
      ).toBe(false);
    });

    test('an apt (linux) uninstall runs "remove", never "purge"', async () => {
      const ctx = context({ catalog: [docker], platform: 'linux' });

      await uninstallCommand(input({ tools: ['docker'] }), ctx);

      expect(ctx.runner.wasRun(['sudo', 'apt', 'remove', '-y', 'docker.io'])).toBe(true);
      expect(
        ctx.runner.commands.some((command) => command.some((arg) => arg.includes('purge') || arg.includes('--zap'))),
      ).toBe(false);
    });
  });

  describe('--dry-run', () => {
    test('reports exactly what would be removed and sends no write command to the Runner', async () => {
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
      const ctx = context({ catalog: [slack] });
      ctx.runner.respondTo(['brew', 'list', '--cask', 'slack'], { exitCode: 0 });

      await uninstallCommand(input({ tools: ['slack'], dryRun: true }), ctx);

      expect(ctx.reporter.messages('line')).toEqual(['→ slack: brew uninstall --cask slack']);
      expect(ctx.runner.wasRun(['brew', 'list', '--cask', 'slack'])).toBe(true);
      expect(ctx.runner.wasRun(['brew', 'uninstall', '--cask', 'slack'])).toBe(false);
    });

    test('--dry-run on an unknown name still fails, without reporting a dry-run plan', async () => {
      const ctx = context();

      const rejected = uninstallCommand(input({ tools: ['not-a-real-tool'], dryRun: true }), ctx);

      await expect(rejected).rejects.toThrow(CliError);
      expect(ctx.runner.commands).toEqual([]);
      expect(ctx.reporter.messages('line')).toEqual([]);
    });

    test('--all --dry-run never asks for confirmation, and still shows the plan', async () => {
      let promptCalled = false;
      const prompts: CliPrompts = {
        ...noPrompts,
        confirmUninstallAll: async () => {
          promptCalled = true;
          return true;
        },
      };
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
      const ctx = context({ catalog, prompts });

      await uninstallCommand(input({ all: true, dryRun: true }), ctx);

      expect(promptCalled).toBe(false);
      expect(ctx.reporter.messages('line')).toEqual(['→ slack: brew uninstall --cask slack']);
      expect(ctx.runner.wasRun(['brew', 'uninstall', '--cask', 'slack'])).toBe(false);
    });
  });

  test('an unknown name fails the whole run without touching the Runner', async () => {
    const ctx = context();

    await expect(uninstallCommand(input({ tools: ['not-a-real-tool'] }), ctx)).rejects.toThrow(CliError);

    expect(ctx.runner.commands).toEqual([]);
  });
});

describe('uninstall command, as reported', () => {
  test("opens each Tool's line before its command runs, in uninstall's own vocabulary", async () => {
    const catalog = [tool('slack', 3, recipe()), tool('docker', 3, recipe({ isInstalled: async () => false }))];
    const ctx = context({ catalog, prompts: confirming });

    await uninstallCommand(input({ all: true }), ctx);

    expect(ctx.reporter.messages('task')).toEqual(['Desinstalando slack', 'Desinstalando docker']);
    expect(ctx.reporter.messages('succeed')).toEqual(['slack desinstalado', 'docker não estava instalado']);
    expect(ctx.reporter.messages('block')).toEqual([
      'Resumo:\n  desinstalados: 1\n  não estavam instalados: 1\n  não suportados: 0\n  falharam: 0',
    ]);
  });

  test('reports the guarded-Stage warning as a warning, before anything runs', async () => {
    const homebrew = tool('homebrew', 0, recipe());
    const ctx = context({ catalog: [homebrew] });

    await uninstallCommand(input({ tools: ['homebrew'] }), ctx);

    expect(ctx.reporter.messages('warn')).toEqual([HOMEBREW_WARNING]);
    expect(ctx.reporter.reports.findIndex((r) => r.kind === 'warn')).toBeLessThan(
      ctx.reporter.reports.findIndex((r) => r.kind === 'task'),
    );
  });

  test('a bare uninstall is refused before anything is reported, and never opens a run', async () => {
    const ctx = context();

    await expect(uninstallCommand(input(), ctx)).rejects.toThrow(CliError);

    expect(ctx.reporter.messages('intro')).toEqual([]);
    expect(ctx.reporter.messages('task')).toEqual([]);
  });
});

describe('formatUninstallSummary', () => {
  test('uses uninstall vocabulary for the four counts and lists each failure', () => {
    const text = formatUninstallSummary({
      installed: 1,
      alreadyInstalled: 1,
      unsupported: 1,
      failed: 1,
      failures: [{ id: 'docker', error: 'network unreachable' }],
    });

    expect(text).toContain('desinstalados: 1');
    expect(text).toContain('não estavam instalados: 1');
    expect(text).toContain('não suportados: 1');
    expect(text).toContain('falharam: 1');
    expect(text).toContain('docker: network unreachable');
    expect(text).not.toContain('\n  instalados:');
    expect(text).not.toContain('\n  já instalados:');
  });

  test('never prints the install-style bare labels, even with zero counts', () => {
    const text = formatUninstallSummary({
      installed: 0,
      alreadyInstalled: 0,
      unsupported: 0,
      failed: 0,
      failures: [],
    });

    expect(text).toContain('desinstalados: 0');
    expect(text).not.toContain('\n  instalados:');
    expect(text).not.toContain('\n  já instalados:');
  });
});
