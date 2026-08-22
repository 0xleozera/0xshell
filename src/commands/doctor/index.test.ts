import { runCommand } from 'citty';
import { describe, expect, spyOn, test } from 'bun:test';
import { MockReporter } from '../../reporter/mock-reporter';
import { MockRunner } from '../../runner/mock-runner';
import { defineTool, type Tool } from '../../tool/define-tool';
import type { Recipe } from '../../tool/recipe';
import { unsupported, type Unsupported } from '../../tool/unsupported';
import { createDoctorCommand } from './index';

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

describe('doctor command', () => {
  test('classifies each Tool as installed, faltando or não suportado', async () => {
    const fixture = [
      tool('git', 0, recipe({ isInstalled: async () => true })),
      tool('neovim', 2, recipe({ isInstalled: async () => false })),
      tool('xcode', 3, unsupported('ferramenta exclusiva da Apple')),
    ];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(createDoctorCommand(new MockRunner(), 'linux', { lookupCatalog: () => fixture }), { rawArgs: [] });

    const lines = logSpy.mock.calls.flat();
    expect(lines).toContain('✓ git instalado');
    expect(lines).toContain('✗ neovim faltando');
    expect(lines).toContain('⊘ xcode não suportado em linux: ferramenta exclusiva da Apple');

    process.exitCode = 0;
    logSpy.mockRestore();
  });

  test('ends with a doctor-flavored summary of the counts, tallied by engine/summary', async () => {
    const fixture = [
      tool('git', 0, recipe({ isInstalled: async () => true })),
      tool('neovim', 2, recipe({ isInstalled: async () => false })),
      tool('xcode', 3, unsupported('ferramenta exclusiva da Apple')),
    ];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(createDoctorCommand(new MockRunner(), 'linux', { lookupCatalog: () => fixture }), { rawArgs: [] });

    const output = logSpy.mock.calls.flat().join('\n');
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

    process.exitCode = 0;
    logSpy.mockRestore();
  });

  test('exits zero when everything is installed or unsupported', async () => {
    const fixture = [
      tool('git', 0, recipe({ isInstalled: async () => true })),
      tool('xcode', 3, unsupported('ferramenta exclusiva da Apple')),
    ];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(createDoctorCommand(new MockRunner(), 'darwin', { lookupCatalog: () => fixture }), { rawArgs: [] });

    expect(process.exitCode).toBe(0);
    logSpy.mockRestore();
  });

  test('exits non-zero when a Tool is missing — a deliberate choice so `doctor && …` can gate a script', async () => {
    const fixture = [tool('neovim', 2, recipe({ isInstalled: async () => false }))];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(createDoctorCommand(new MockRunner(), 'darwin', { lookupCatalog: () => fixture }), { rawArgs: [] });

    expect(process.exitCode).not.toBe(0);

    process.exitCode = 0;
    logSpy.mockRestore();
  });

  test('never sends a write command to the Runner — only isInstalled() reads run', async () => {
    const runner = new MockRunner();
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
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(createDoctorCommand(runner, 'darwin', { lookupCatalog: () => fixture }), { rawArgs: [] });

    expect(runner.commands).toEqual([['git', '--version']]);
    expect(runner.wasRun(['brew', 'install', 'neovim'])).toBe(false);
    expect(runner.wasRun(['brew', 'uninstall', 'neovim'])).toBe(false);

    process.exitCode = 0;
    logSpy.mockRestore();
  });
});

describe('doctor command, as reported', () => {
  test('opens a line per Tool while it is checked, and closes it with what was found', async () => {
    const reporter = new MockReporter();
    const fixture = [
      tool('git', 0, recipe({ isInstalled: async () => true })),
      tool('neovim', 2, recipe({ isInstalled: async () => false })),
      tool('xcode', 3, unsupported('ferramenta exclusiva da Apple')),
    ];

    await runCommand(createDoctorCommand(new MockRunner(), 'linux', { lookupCatalog: () => fixture, reporter }), {
      rawArgs: [],
    });

    expect(reporter.messages('task')).toEqual(['Verificando git', 'Verificando neovim', 'Verificando xcode']);
    expect(reporter.messages('succeed')).toEqual(['git instalado']);
    // A missing Tool is `doctor`'s normal finding, so it is reported as
    // absent and never through the failure vocabulary of `install`.
    expect(reporter.messages('absent')).toEqual(['neovim faltando']);
    expect(reporter.messages('fail')).toEqual([]);
    expect(reporter.messages('skip')).toEqual(['xcode não suportado em linux: ferramenta exclusiva da Apple']);

    process.exitCode = 0;
  });

  test('signs off pointing at install when something is missing, and quietly when nothing is', async () => {
    const missing = new MockReporter();
    const complete = new MockReporter();

    await runCommand(
      createDoctorCommand(new MockRunner(), 'darwin', {
        lookupCatalog: () => [tool('neovim', 2, recipe({ isInstalled: async () => false }))],
        reporter: missing,
      }),
      { rawArgs: [] },
    );
    process.exitCode = 0;

    await runCommand(
      createDoctorCommand(new MockRunner(), 'darwin', {
        lookupCatalog: () => [tool('neovim', 2, recipe({ isInstalled: async () => true }))],
        reporter: complete,
      }),
      { rawArgs: [] },
    );

    expect(missing.messages('outro')).toEqual(['Falta 1 ferramenta — rode 0xshell install.']);
    expect(missing.messages('block')).toEqual(['Resumo:\n  instalados: 0\n  faltando: 1\n  não suportados: 0']);
    expect(complete.messages('outro')).toEqual(['Máquina em dia.']);
  });
});
