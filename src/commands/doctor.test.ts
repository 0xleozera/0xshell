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
    tool('xcode', 3, unsupported('Apple-only tool')),
  ];

  test('classifies each Tool as installed, missing or unsupported', async () => {
    const ctx = context(machine, 'linux');

    await doctorCommand({}, ctx);

    expect(ctx.reporter.messages('succeed')).toContain('git installed');
    expect(ctx.reporter.messages('absent')).toContain('neovim missing');
    expect(ctx.reporter.messages('skip')).toContain('xcode not supported on linux: Apple-only tool');
  });

  test('ends with a doctor-flavored summary of the counts, tallied by the shared summarize()', async () => {
    const ctx = context(machine, 'linux');

    await doctorCommand({}, ctx);

    const output = ctx.reporter.output;
    expect(output).toContain('installed: 1');
    expect(output).toContain('missing: 1');
    expect(output).toContain('not supported: 1');
    // doctor never reports things in install's failure vocabulary — a
    // missing Tool is not a failure of the check itself.
    expect(output).not.toContain('failed:');
    expect(output).not.toContain('Failures:');
    // `alreadyInstalled` is always zero for doctor (see reportOutcome) and
    // says nothing useful, so it is not printed at all.
    expect(output).not.toContain('already installed');
  });

  test('reports no failure when everything is installed or unsupported, so the shell sees a clean machine', async () => {
    const fixture = [
      tool('git', 0, recipe({ isInstalled: async () => true })),
      tool('xcode', 3, unsupported('Apple-only tool')),
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
      tool('xcode', 3, unsupported('Apple-only tool')),
    ];
    const ctx = context(fixture, 'linux');

    await doctorCommand({}, ctx);

    expect(ctx.reporter.messages('task')).toEqual(['Checking git', 'Checking neovim', 'Checking xcode']);
    expect(ctx.reporter.messages('succeed')).toEqual(['git installed']);
    // A missing Tool is `doctor`'s normal finding, so it is reported as
    // absent and never through the failure vocabulary of `install`.
    expect(ctx.reporter.messages('absent')).toEqual(['neovim missing']);
    expect(ctx.reporter.messages('fail')).toEqual([]);
    expect(ctx.reporter.messages('skip')).toEqual(['xcode not supported on linux: Apple-only tool']);
  });

  test('signs off pointing at install when something is missing, and quietly when nothing is', async () => {
    const missing = context([tool('neovim', 2, recipe({ isInstalled: async () => false }))]);
    const complete = context([tool('neovim', 2, recipe({ isInstalled: async () => true }))]);

    await doctorCommand({}, missing);
    await doctorCommand({}, complete);

    expect(missing.reporter.messages('outro')).toEqual(['1 tool missing — run 0xshell install.']);
    expect(missing.reporter.messages('block')).toEqual(['Summary:\n  installed: 0\n  missing: 1\n  not supported: 0']);
    expect(complete.reporter.messages('outro')).toEqual(['Machine up to date.']);
  });
});
