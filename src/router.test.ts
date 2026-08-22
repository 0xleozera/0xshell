import { describe, expect, test } from 'bun:test';
import { createCli, FailedToExitError } from 'trpc-cli';
import type { CliContext, CliPrompts } from './lib/context';
import { exitCodeFor } from './lib/errors';
import { createMockReporter, type MockReporter } from './lib/mock-reporter';
import { createMockRunner, type MockRunner } from './lib/mock-runner';
import type { Recipe } from './lib/recipe';
import { defineTool, type Tool } from './lib/tool';
import { router } from './router';

function tool(id: string, stage: 0 | 1 | 2 | 3, overrides: Partial<Recipe> = {}, tags: string[] = []): Tool {
  const recipe: Recipe = {
    install: async () => {},
    uninstall: async () => {},
    isInstalled: async () => false,
    ...overrides,
  };

  return defineTool({ id, stage, tags, darwin: recipe, linux: recipe });
}

const noPrompts: CliPrompts = {
  askToolsToInstall: async () => {
    throw new Error('the prompt should not have been opened');
  },
  confirmUninstallAll: async () => {
    throw new Error('the prompt should not have been opened');
  },
};

type TestContext = CliContext & { readonly runner: MockRunner; readonly reporter: MockReporter };

function context(catalog: readonly Tool[]): TestContext {
  return {
    runner: createMockRunner(),
    reporter: createMockReporter(),
    platform: 'darwin',
    catalog,
    prompts: noPrompts,
  } as TestContext;
}

/**
 * Drives the CLI exactly as `cli.ts` does — same router, same argv path,
 * same non-exiting `process` stub — so parsing, validation and the command
 * are exercised in one pass, without spawning anything.
 */
async function run(argv: string[], ctx: CliContext) {
  const printed: unknown[] = [];
  const errors: unknown[] = [];
  let exitCode = 0;
  let cause: unknown;

  try {
    await createCli({ router, name: '0xshell', context: ctx }).run({
      argv,
      logger: { info: (value) => printed.push(value), error: (value) => errors.push(value) },
      prompts: false,
      process: {
        exit: (code) => {
          exitCode = code;
          return undefined as never;
        },
      },
    });
  } catch (error) {
    cause = error instanceof FailedToExitError ? error.cause : error;
  }

  return { printed, errors, exitCode, cause };
}

describe('cli surface', () => {
  test('install takes the Tool ids as positionals', async () => {
    const installed: string[] = [];
    const catalog = [
      tool('neovim', 2, {
        install: async () => {
          installed.push('neovim');
        },
      }),
      tool('docker', 3, {
        install: async () => {
          installed.push('docker');
        },
      }),
    ];

    const { exitCode } = await run(['install', 'neovim', 'docker'], context(catalog));

    expect(installed).toEqual(['neovim', 'docker']);
    expect(exitCode).toBe(0);
  });

  test('--dry-run reaches the command as a flag: the plan is reported, the machine is not touched', async () => {
    const catalog = [
      tool('neovim', 2, {
        install: async (runner) => {
          await runner.run(['mise', 'install', 'neovim']);
        },
      }),
    ];
    const ctx = context(catalog);

    await run(['install', 'neovim', '--dry-run'], ctx);

    expect(ctx.reporter.messages('line')).toEqual(['\u2192 neovim: mise install neovim']);
    expect(ctx.runner.wasRun(['mise', 'install', 'neovim'])).toBe(false);
    expect(ctx.reporter.messages('outro')).toEqual(['Nada foi executado.']);
  });

  test('--tag is parsed as a value flag', async () => {
    const installed: string[] = [];
    const catalog = [
      tool(
        'neovim',
        2,
        {
          install: async () => {
            installed.push('neovim');
          },
        },
        ['cli'],
      ),
      tool(
        'slack',
        3,
        {
          install: async () => {
            installed.push('slack');
          },
        },
        ['apps'],
      ),
    ];

    await run(['install', '--tag', 'cli'], context(catalog));

    expect(installed).toEqual(['neovim']);
  });

  test('a usage error comes back tagged, so the shell gets exit 2 rather than a generic failure', async () => {
    const { cause } = await run(['install', 'not-a-real-tool'], context([]));

    expect(exitCodeFor(cause)).toBe(2);
  });

  test('a bare uninstall is refused by the command, not by the parser', async () => {
    const ctx = context([tool('slack', 3)]);

    const { cause } = await run(['uninstall'], ctx);

    expect(exitCodeFor(cause)).toBe(2);
    expect(ctx.runner.commands).toEqual([]);
  });

  test('list and doctor take no argument at all', async () => {
    const ctx = context([tool('slack', 3, { isInstalled: async () => true })]);

    const listed = await run(['list'], ctx);
    const checked = await run(['doctor'], ctx);

    expect(listed.exitCode).toBe(0);
    expect(checked.exitCode).toBe(0);
    expect(ctx.reporter.messages('intro')).toEqual(['0xshell list', '0xshell doctor']);
  });

  test('an unknown flag is rejected before any command runs', async () => {
    const ctx = context([tool('slack', 3)]);

    const { exitCode } = await run(['install', '--not-a-flag'], ctx);

    expect(exitCode).not.toBe(0);
    expect(ctx.reporter.messages('task')).toEqual([]);
  });
});
