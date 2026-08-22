import { describe, expect, test } from 'bun:test';
import type { CliContext, CliPrompts } from '../lib/context';
import { createMockReporter, type MockReporter } from '../lib/mock-reporter';
import { createMockRunner, type MockRunner } from '../lib/mock-runner';
import type { Recipe } from '../lib/recipe';
import { defineTool, unsupported, type Tool, type Unsupported } from '../lib/tool';
import { listCommand } from './list';

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

describe('list command', () => {
  test('reports every Tool with its Tag, Stage and support on the current Plataforma', () => {
    const ctx = context([tool('neovim', 2, recipe(), ['cli']), tool('slack', 3, recipe(), ['apps'])]);

    listCommand({}, ctx);

    expect(ctx.reporter.output).toContain('neovim [stage 2] [tags: cli] ✓ suportado em darwin');
    expect(ctx.reporter.output).toContain('slack [stage 3] [tags: apps] ✓ suportado em darwin');
  });

  test('shows the declared reason for an unsupported Tool', () => {
    const ctx = context([tool('xcode', 3, unsupported('ferramenta exclusiva da Apple'))], 'linux');

    listCommand({}, ctx);

    expect(ctx.reporter.output).toContain('⊘ não suportado em linux: ferramenta exclusiva da Apple');
  });

  test('includes the note that npm ships with node', () => {
    const ctx = context([]);

    listCommand({}, ctx);

    expect(ctx.reporter.output.toLowerCase()).toContain('npm');
    expect(ctx.reporter.output.toLowerCase()).toContain('node');
  });

  test('never sends any command to the Runner', () => {
    const ctx = context([tool('neovim', 2, recipe(), ['cli']), tool('xcode', 3, unsupported('motivo'))]);

    listCommand({}, ctx);

    expect(ctx.runner.commands).toEqual([]);
  });

  test('returns the Catalog it described, in Stage order', () => {
    const ctx = context([tool('slack', 3, recipe(), ['apps']), tool('neovim', 2, recipe(), ['cli'])]);

    const result = listCommand({}, ctx);

    expect(result.tools).toEqual([
      { id: 'neovim', stage: 2, tags: ['cli'], supported: true },
      { id: 'slack', stage: 3, tags: ['apps'], supported: true },
    ]);
  });
});

describe('list command, as reported', () => {
  test('reports one pre-formatted row per Tool and never opens a Tool line', () => {
    const ctx = context([tool('slack', 3, recipe(), ['apps']), tool('neovim', 2, recipe(), ['cli'])]);

    listCommand({}, ctx);

    // In Stage order, and as rows: `list` describes the Catalog, it does not
    // work on it, so there is no progress to report.
    expect(ctx.reporter.messages('line')).toEqual([
      'neovim [stage 2] [tags: cli] ✓ suportado em darwin\nslack [stage 3] [tags: apps] ✓ suportado em darwin',
    ]);
    expect(ctx.reporter.messages('task')).toEqual([]);
  });

  test('closes with the note about npm and the size of the Catalog', () => {
    const ctx = context([tool('neovim', 2)]);

    listCommand({}, ctx);

    expect(ctx.reporter.messages('info').join()).toContain('npm');
    expect(ctx.reporter.messages('outro')).toEqual(['1 ferramenta no Catálogo.']);
  });
});
