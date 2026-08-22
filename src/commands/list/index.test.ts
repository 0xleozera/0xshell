import { runCommand } from 'citty';
import { describe, expect, spyOn, test } from 'bun:test';
import { MockReporter } from '../../reporter/mock-reporter';
import { MockRunner } from '../../runner/mock-runner';
import { defineTool, type Tool } from '../../tool/define-tool';
import type { Recipe } from '../../tool/recipe';
import { unsupported, type Unsupported } from '../../tool/unsupported';
import { createListCommand } from './index';

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

describe('list command', () => {
  test('prints every Tool with its Tag, Stage and support on the current Plataforma', async () => {
    const fixture = [tool('neovim', 2, recipe(), ['cli']), tool('slack', 3, recipe(), ['apps'])];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(createListCommand(new MockRunner(), 'darwin', { lookupCatalog: () => fixture }), { rawArgs: [] });

    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('neovim [stage 2] [tags: cli] ✓ suportado em darwin');
    expect(output).toContain('slack [stage 3] [tags: apps] ✓ suportado em darwin');

    logSpy.mockRestore();
  });

  test('shows the declared reason for an unsupported Tool', async () => {
    const fixture = [tool('xcode', 3, unsupported('ferramenta exclusiva da Apple'))];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(createListCommand(new MockRunner(), 'linux', { lookupCatalog: () => fixture }), { rawArgs: [] });

    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain('⊘ não suportado em linux: ferramenta exclusiva da Apple');

    logSpy.mockRestore();
  });

  test('includes the note that npm ships with node', async () => {
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(createListCommand(new MockRunner(), 'darwin', { lookupCatalog: () => [] }), { rawArgs: [] });

    const output = logSpy.mock.calls.flat().join('\n');
    expect(output.toLowerCase()).toContain('npm');
    expect(output.toLowerCase()).toContain('node');

    logSpy.mockRestore();
  });

  test('never sends any command to the Runner', async () => {
    const runner = new MockRunner();
    const fixture = [tool('neovim', 2, recipe(), ['cli']), tool('xcode', 3, unsupported('motivo'))];
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(createListCommand(runner, 'darwin', { lookupCatalog: () => fixture }), { rawArgs: [] });

    expect(runner.commands).toEqual([]);

    logSpy.mockRestore();
  });
});

describe('list command, as reported', () => {
  test('reports one pre-formatted row per Tool and never opens a Tool line', async () => {
    const reporter = new MockReporter();
    const fixture = [tool('slack', 3, recipe(), ['apps']), tool('neovim', 2, recipe(), ['cli'])];

    await runCommand(createListCommand(new MockRunner(), 'darwin', { lookupCatalog: () => fixture, reporter }), {
      rawArgs: [],
    });

    // In Stage order, and as rows: `list` describes the Catalog, it does not
    // work on it, so there is no progress to report.
    expect(reporter.messages('line')).toEqual([
      'neovim [stage 2] [tags: cli] ✓ suportado em darwin\nslack [stage 3] [tags: apps] ✓ suportado em darwin',
    ]);
    expect(reporter.messages('task')).toEqual([]);
  });

  test('closes with the note about npm and the size of the Catalog', async () => {
    const reporter = new MockReporter();

    await runCommand(
      createListCommand(new MockRunner(), 'darwin', { lookupCatalog: () => [tool('neovim', 2)], reporter }),
      { rawArgs: [] },
    );

    expect(reporter.messages('info').join()).toContain('npm');
    expect(reporter.messages('outro')).toEqual(['1 ferramenta no Catálogo.']);
  });
});
