import { describe, expect, test } from 'bun:test';
import { catalog as realCatalog } from '../lib/catalog';
import type { CliContext, CliPrompts } from '../lib/context';
import { CliError } from '../lib/errors';
import { brewCask } from '../lib/helpers/brew-cask';
import { createMockReporter, type MockReporter } from '../lib/mock-reporter';
import { createMockRunner, type MockRunner } from '../lib/mock-runner';
import type { Recipe } from '../lib/recipe';
import { defineTool, unsupported, type Tool, type Unsupported } from '../lib/tool';
import type { InstallInput } from '../schemas/commands';
import { formatInstallSummary, installCommand } from './install';

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

function context(overrides: Partial<CliContext> = {}): TestContext {
  return {
    runner: createMockRunner(),
    reporter: createMockReporter(),
    platform: 'darwin',
    catalog: realCatalog,
    prompts: noPrompts,
    ...overrides,
  } as TestContext;
}

function input(overrides: Partial<InstallInput> = {}): InstallInput {
  return { tools: [], interactive: false, dryRun: false, ...overrides };
}

describe('install command', () => {
  test('installs the tool when it is not already installed', async () => {
    const ctx = context();
    ctx.runner.failOn(['brew', 'list', '--cask', 'slack']);

    await installCommand(input({ tools: ['slack'] }), ctx);

    expect(ctx.runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(true);
  });

  test('does not run the install command when already installed', async () => {
    const ctx = context();
    ctx.runner.respondTo(['brew', 'list', '--cask', 'slack'], { exitCode: 0 });

    await installCommand(input({ tools: ['slack'] }), ctx);

    expect(ctx.runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(false);
  });

  test('reports an unknown tool as a usage error, without touching the Runner', async () => {
    const ctx = context();

    const rejected = installCommand(input({ tools: ['not-a-real-tool'] }), ctx);

    await expect(rejected).rejects.toThrow(CliError);
    expect(ctx.runner.commands).toEqual([]);
  });

  test('resolves the darwin recipe on darwin and the linux recipe on linux for the same Tool', async () => {
    const slack = defineTool({
      id: 'slack',
      stage: 3,
      tags: [],
      darwin: brewCask('slack'),
      linux: unsupported('não usado neste teste'),
    });
    const ctx = context({ catalog: [slack] });
    ctx.runner.failOn(['brew', 'list', '--cask', 'slack']);

    await installCommand(input({ tools: ['slack'] }), ctx);

    expect(ctx.runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(true);
  });

  test('reports ⊘ and the reason for an unsupported tool, without touching the Runner or counting it as a failure', async () => {
    const xcode = defineTool({
      id: 'xcode',
      stage: 3,
      tags: [],
      darwin: brewCask('xcode'),
      linux: unsupported('ferramenta exclusiva da Apple'),
    });
    const ctx = context({ catalog: [xcode], platform: 'linux' });

    const result = await installCommand(input({ tools: ['xcode'] }), ctx);

    expect(ctx.runner.commands).toEqual([]);
    expect(ctx.reporter.messages('skip')).toEqual(['xcode não suportado em linux: ferramenta exclusiva da Apple']);
    expect(result).toMatchObject({ summary: { failed: 0, unsupported: 1 } });
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

    await installCommand(input(), context({ catalog }));

    expect(order).toEqual(['brew', 'mise', 'slack']);
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
    const ctx = context({ catalog });

    const result = await installCommand(input(), ctx);

    expect(ctx.reporter.messages('fail')).toEqual(['brew falhou: curl falhou']);
    expect(result).toMatchObject({ summary: { installed: 0, failed: 1 } });
    expect(ctx.reporter.messages('block').join('\n')).toContain('instalados: 0');
  });

  test('a failure outside Stage 0 is collected, later Tools still run, and the run is reported as failed', async () => {
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
    const ctx = context({ catalog });

    const result = await installCommand(input(), ctx);

    const summary = ctx.reporter.messages('block').join('\n');
    expect(summary).toContain('instalados: 2');
    expect(summary).toContain('falharam: 1');
    expect(summary).toContain('flaky: network unreachable');
    expect(result).toMatchObject({ summary: { installed: 2, failed: 1 } });
  });

  test('the run is reported as clean when it has only successes, already-installed and unsupported Tools', async () => {
    const catalog = [
      tool('brew', 0, recipe()),
      tool('git', 3, recipe({ isInstalled: async () => true })),
      tool('xcode', 3, unsupported('ferramenta exclusiva da Apple')),
    ];

    const result = await installCommand(input(), context({ catalog }));

    expect(result).toMatchObject({ summary: { failed: 0 } });
  });

  test('re-running after a partial failure only reinstalls what is still missing', async () => {
    const installedIds = new Set<string>();
    let flakyInstallCalls = 0;
    let brewInstallCalls = 0;
    const catalog = [
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

    await installCommand(input(), context({ catalog }));
    expect(installedIds).toEqual(new Set(['brew']));

    await installCommand(input(), context({ catalog }));

    expect(installedIds).toEqual(new Set(['brew', 'flaky']));
    expect(brewInstallCalls).toBe(1);
    expect(flakyInstallCalls).toBe(2);
  });

  test('installs exactly the named tools, in Stage order rather than argument order', async () => {
    const order: string[] = [];
    const install = (id: string) => async () => {
      order.push(id);
    };
    const catalog = [
      tool('neovim', 2, recipe({ install: install('neovim') })),
      tool('docker', 3, recipe({ install: install('docker') })),
      tool('slack', 3, recipe({ install: install('slack') })),
    ];

    await installCommand(input({ tools: ['docker', 'neovim'] }), context({ catalog }));

    expect(order).toEqual(['neovim', 'docker']);
  });

  test('an unknown name among several fails the whole run and installs nothing', async () => {
    const installed: string[] = [];
    const catalog = [
      tool(
        'neovim',
        2,
        recipe({
          install: async () => {
            installed.push('neovim');
          },
        }),
      ),
    ];

    const rejected = installCommand(input({ tools: ['neovim', 'not-a-real-tool'] }), context({ catalog }));

    await expect(rejected).rejects.toThrow('Ferramenta(s) desconhecida(s) no Catálogo: not-a-real-tool');
    expect(installed).toEqual([]);
  });

  test('--tag installs exactly the Tools carrying that Tag', async () => {
    const installed: string[] = [];
    const install = (id: string) => async () => {
      installed.push(id);
    };
    const catalog = [
      tool('slack', 3, recipe({ install: install('slack') }), ['apps']),
      tool('neovim', 2, recipe({ install: install('neovim') }), ['cli']),
      tool('bun', 1, recipe({ install: install('bun') }), ['runtimes']),
    ];

    await installCommand(input({ tag: 'cli' }), context({ catalog }));

    expect(installed).toEqual(['neovim']);
  });

  test('--interactive installs exactly the Tools marked in the multiselect', async () => {
    const installed: string[] = [];
    const install = (id: string) => async () => {
      installed.push(id);
    };
    const catalog = [
      tool('slack', 3, recipe({ install: install('slack') })),
      tool('neovim', 2, recipe({ install: install('neovim') })),
    ];
    const prompts: CliPrompts = {
      ...noPrompts,
      askToolsToInstall: async (offered) => offered.filter((t) => t.id === 'neovim'),
    };

    await installCommand(input({ interactive: true }), context({ catalog, prompts }));

    expect(installed).toEqual(['neovim']);
  });

  test('without --interactive, the prompt is never opened', async () => {
    const catalog = [tool('slack', 3, recipe())];

    // `noPrompts` throws when opened, so reaching the end is the assertion.
    const result = await installCommand(input({ tools: ['slack'] }), context({ catalog }));

    expect(result).toMatchObject({ summary: { installed: 1 } });
  });

  test('--dry-run reports exactly what would run and sends no write command to the Runner', async () => {
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
    const ctx = context({ catalog: [slack] });
    ctx.runner.failOn(['brew', 'list', '--cask', 'slack']);

    await installCommand(input({ tools: ['slack'], dryRun: true }), ctx);

    expect(ctx.reporter.messages('line')).toEqual(['→ slack: brew install --cask slack']);
    expect(ctx.runner.wasRun(['brew', 'list', '--cask', 'slack'])).toBe(true);
    expect(ctx.runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(false);
  });

  test('--dry-run on an unknown name still fails, without reporting a dry-run plan', async () => {
    const ctx = context();

    const rejected = installCommand(input({ tools: ['not-a-real-tool'], dryRun: true }), ctx);

    await expect(rejected).rejects.toThrow(CliError);
    expect(ctx.runner.commands).toEqual([]);
    expect(ctx.reporter.messages('line')).toEqual([]);
  });
});

describe('install command, as reported', () => {
  test("opens each Tool's line before its command runs, and closes it with the Outcome", async () => {
    const openWhileInstalling: string[] = [];
    const ctx = context();
    const catalog = [
      tool(
        'brew',
        0,
        recipe({
          install: async () => {
            openWhileInstalling.push(...ctx.reporter.messages('task'));
          },
        }),
      ),
    ];

    await installCommand(input(), { ...ctx, catalog });

    // The line is already open while `install()` runs — that is the whole
    // point of reporting before the command instead of after it.
    expect(openWhileInstalling).toEqual(['Instalando brew']);
    expect(ctx.reporter.messages('task', 'succeed')).toEqual(['Instalando brew', 'brew instalado']);
  });

  test('closes each line under the kind its Outcome deserves', async () => {
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
    const ctx = context({ catalog });

    await installCommand(input(), ctx);

    expect(ctx.reporter.messages('succeed')).toEqual(['git já estava instalado', 'slack instalado']);
    expect(ctx.reporter.messages('skip')).toEqual(['xcode não suportado em darwin: ferramenta exclusiva da Apple']);
    expect(ctx.reporter.messages('fail')).toEqual(['docker falhou: curl falhou']);
  });

  test('files the closing summary under its own title and signs off', async () => {
    const ctx = context({ catalog: [tool('slack', 3, recipe())] });

    await installCommand(input(), ctx);

    expect(ctx.reporter.messages('block')).toEqual([
      'Resumo:\n  instalados: 1\n  já instalados: 0\n  não suportados: 0\n  falharam: 0',
    ]);
    expect(ctx.reporter.messages('outro')).toEqual(['Tudo pronto.']);
  });

  test('a filtered run reports its Tools and skips the summary block', async () => {
    const ctx = context({ catalog: [tool('slack', 3, recipe())] });

    await installCommand(input({ tools: ['slack'] }), ctx);

    expect(ctx.reporter.messages('succeed')).toEqual(['slack instalado']);
    expect(ctx.reporter.messages('block')).toEqual([]);
  });

  test('an unknown name never opens a Tool line', async () => {
    const ctx = context();

    await expect(installCommand(input({ tools: ['not-a-real-tool'] }), ctx)).rejects.toThrow(CliError);

    expect(ctx.reporter.messages('task')).toEqual([]);
  });
});

describe('formatInstallSummary', () => {
  test('includes the four counts and lists each failure', () => {
    const text = formatInstallSummary({
      installed: 1,
      alreadyInstalled: 0,
      unsupported: 0,
      failed: 1,
      failures: [{ id: 'docker', error: 'network unreachable' }],
    });

    expect(text).toContain('instalados: 1');
    expect(text).toContain('já instalados: 0');
    expect(text).toContain('não suportados: 0');
    expect(text).toContain('falharam: 1');
    expect(text).toContain('docker: network unreachable');
  });
});
