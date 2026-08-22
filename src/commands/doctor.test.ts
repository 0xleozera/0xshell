import { describe, expect, test } from 'bun:test';
import type { CliContext, CliPrompts } from '../lib/context';
import { createMockReporter, type MockReporter } from '../lib/mock-reporter';
import { createMockRunner, type MockRunner } from '../lib/mock-runner';
import type { Recipe } from '../lib/recipe';
import { defineTool, unsupported, type Tool, type Unsupported } from '../lib/tool';
import { doctorCommand } from './doctor';

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

/** No test may reach a prompt it did not ask for: every one of them hangs a script. */
const noPrompts: CliPrompts = {
  askToolsToInstall: async () => {
    throw new Error('the prompt should not have been opened');
  },
  confirmUninstallAll: async () => {
    throw new Error('the prompt should not have been opened');
  },
};

type TestContext = CliContext & { readonly runner: MockRunner; readonly reporter: MockReporter };

function context(catalog: readonly Tool[], platform: 'darwin' | 'linux' = 'darwin'): TestContext {
  return {
    runner: createMockRunner(),
    reporter: createMockReporter(),
    platform,
    catalog,
    prompts: noPrompts,
  } as TestContext;
}

describe('doctor command', () => {
  const machine = [
    tool('git', 0, recipe({ isInstalled: async () => true })),
    tool('neovim', 2, recipe({ isInstalled: async () => false })),
    tool('xcode', 3, unsupported('ferramenta exclusiva da Apple')),
  ];

  test('classifies each Tool as installed, faltando or não suportado', async () => {
    const ctx = context(machine, 'linux');

    await doctorCommand({}, ctx);

    expect(ctx.reporter.messages('succeed')).toContain('git instalado');
    expect(ctx.reporter.messages('absent')).toContain('neovim faltando');
    expect(ctx.reporter.messages('skip')).toContain('xcode não suportado em linux: ferramenta exclusiva da Apple');
  });

  test('ends with a doctor-flavored summary of the counts, tallied by the shared summarize()', async () => {
    const ctx = context(machine, 'linux');

    await doctorCommand({}, ctx);

    const output = ctx.reporter.output;
    expect(output).toContain('instalados: 1');
    expect(output).toContain('faltando: 1');
    expect(output).toContain('não suportados: 1');
    // doctor never reports things in install's failure vocabulary — a
    // missing Tool is not a failure of the check itself.
    expect(output).not.toContain('falharam');
    expect(output).not.toContain('Falhas:');
    // `alreadyInstalled` is always zero for doctor (see reportOutcome) and
    // says nothing useful, so it is not printed at all.
    expect(output).not.toContain('já instalados');
  });

  test('reports no failure when everything is installed or unsupported, so the shell sees a clean machine', async () => {
    const fixture = [
      tool('git', 0, recipe({ isInstalled: async () => true })),
      tool('xcode', 3, unsupported('ferramenta exclusiva da Apple')),
    ];

    const result = await doctorCommand({}, context(fixture));

    expect(result.summary.failed).toBe(0);
  });

  test('counts a missing Tool as a failure — a deliberate choice so `doctor && …` can gate a script', async () => {
    const fixture = [tool('neovim', 2, recipe({ isInstalled: async () => false }))];

    const result = await doctorCommand({}, context(fixture));

    expect(result.summary.failed).toBe(1);
  });

  test('never sends a write command to the Runner — only isInstalled() reads run', async () => {
    const fixture = [
      tool(
        'git',
        0,
        recipe({
          isInstalled: async (r) => (await r.run(['git', '--version'])).exitCode === 0,
        }),
      ),
      tool(
        'neovim',
        2,
        recipe({
          install: async (r) => {
            await r.run(['brew', 'install', 'neovim']);
          },
          uninstall: async (r) => {
            await r.run(['brew', 'uninstall', 'neovim']);
          },
          isInstalled: async () => false,
        }),
      ),
    ];
    const ctx = context(fixture);

    await doctorCommand({}, ctx);

    expect(ctx.runner.commands).toEqual([['git', '--version']]);
    expect(ctx.runner.wasRun(['brew', 'install', 'neovim'])).toBe(false);
    expect(ctx.runner.wasRun(['brew', 'uninstall', 'neovim'])).toBe(false);
  });
});

describe('doctor command, as reported', () => {
  test('opens a line per Tool while it is checked, and closes it with what was found', async () => {
    const fixture = [
      tool('git', 0, recipe({ isInstalled: async () => true })),
      tool('neovim', 2, recipe({ isInstalled: async () => false })),
      tool('xcode', 3, unsupported('ferramenta exclusiva da Apple')),
    ];
    const ctx = context(fixture, 'linux');

    await doctorCommand({}, ctx);

    expect(ctx.reporter.messages('task')).toEqual(['Verificando git', 'Verificando neovim', 'Verificando xcode']);
    expect(ctx.reporter.messages('succeed')).toEqual(['git instalado']);
    // A missing Tool is `doctor`'s normal finding, so it is reported as
    // absent and never through the failure vocabulary of `install`.
    expect(ctx.reporter.messages('absent')).toEqual(['neovim faltando']);
    expect(ctx.reporter.messages('fail')).toEqual([]);
    expect(ctx.reporter.messages('skip')).toEqual(['xcode não suportado em linux: ferramenta exclusiva da Apple']);
  });

  test('signs off pointing at install when something is missing, and quietly when nothing is', async () => {
    const missing = context([tool('neovim', 2, recipe({ isInstalled: async () => false }))]);
    const complete = context([tool('neovim', 2, recipe({ isInstalled: async () => true }))]);

    await doctorCommand({}, missing);
    await doctorCommand({}, complete);

    expect(missing.reporter.messages('outro')).toEqual(['Falta 1 ferramenta — rode 0xshell install.']);
    expect(missing.reporter.messages('block')).toEqual(['Resumo:\n  instalados: 0\n  faltando: 1\n  não suportados: 0']);
    expect(complete.reporter.messages('outro')).toEqual(['Máquina em dia.']);
  });
});
