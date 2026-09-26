import { describe, expect, test } from 'bun:test';
import { apt } from './helpers/apt';
import { brewCask } from './helpers/brew-cask';
import { runInstallPlan } from './install-plan';
import { createMockRunner } from './mock-runner';
import type { Outcome } from './outcome';
import type { Recipe } from './recipe';
import type { SudoSession } from './sudo-session';
import { defineTool, unsupported, type Tool } from './tool';
import { aptGetInstall, aptGetRemove } from './helpers/apt-get';

function fakeSudoSession(events: string[]): SudoSession {
  return {
    async start(): Promise<void> {
      events.push('start');
    },
    stop(): void {
      events.push('stop');
    },
  };
}

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    install: async () => {},
    uninstall: async () => {},
    isInstalled: async () => false,
    ...overrides,
  };
}

function tool(id: string, stage: 0 | 1 | 2 | 3, darwin: Recipe | ReturnType<typeof unsupported> = recipe()): Tool {
  return defineTool({ id, stage, tags: [], darwin, linux: darwin });
}

describe('runInstallPlan', () => {
  test('runs Tools in Stage order, not registration order', async () => {
    const order: string[] = [];
    const install = (id: string) => async () => {
      order.push(id);
    };
    const tools = [
      tool('slack', 3, recipe({ install: install('slack') })),
      tool('brew', 0, recipe({ install: install('brew') })),
      tool('node', 2, recipe({ install: install('node') })),
      tool('mise', 1, recipe({ install: install('mise') })),
    ];

    await runInstallPlan(tools, createMockRunner(), 'darwin');

    expect(order).toEqual(['brew', 'mise', 'node', 'slack']);
  });

  test('runs sequentially: no Tool starts before the previous one settles', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    const track = async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await Promise.resolve();
      concurrent--;
    };
    const tools = [tool('a', 1, recipe({ install: track })), tool('b', 1, recipe({ install: track }))];

    await runInstallPlan(tools, createMockRunner(), 'darwin');

    expect(maxConcurrent).toBe(1);
  });

  test('a Stage 0 failure is fatal and aborts every later Tool, including other Stage 0 Tools', async () => {
    const ran: string[] = [];
    const tools = [
      tool(
        'brew',
        0,
        recipe({
          install: async () => {
            throw new Error('curl failed');
          },
        }),
      ),
      tool(
        'other-stage-0',
        0,
        recipe({
          install: async () => {
            ran.push('other-stage-0');
          },
        }),
      ),
      tool(
        'mise',
        1,
        recipe({
          install: async () => {
            ran.push('mise');
          },
        }),
      ),
    ];

    const outcomes = await runInstallPlan(tools, createMockRunner(), 'darwin');

    expect(outcomes).toEqual([{ status: 'failed', id: 'brew', error: 'curl failed' }]);
    expect(ran).toEqual([]);
  });

  test('a failure outside Stage 0 is collected and execution continues', async () => {
    const tools = [
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

    const outcomes = await runInstallPlan(tools, createMockRunner(), 'darwin');

    expect(outcomes).toEqual([
      { status: 'installed', id: 'brew' },
      { status: 'failed', id: 'flaky', error: 'network unreachable' },
      { status: 'installed', id: 'slack' },
    ]);
  });

  test('reports already-installed without calling install', async () => {
    let installCalled = false;
    const tools = [
      tool(
        'git',
        3,
        recipe({
          isInstalled: async () => true,
          install: async () => {
            installCalled = true;
          },
        }),
      ),
    ];

    const outcomes = await runInstallPlan(tools, createMockRunner(), 'darwin');

    expect(outcomes).toEqual([{ status: 'already-installed', id: 'git' }]);
    expect(installCalled).toBe(false);
  });

  test('reports unsupported without touching the Runner', async () => {
    const runner = createMockRunner();
    const tools = [tool('xcode', 3, unsupported('Apple-only tool'))];

    const outcomes = await runInstallPlan(tools, runner, 'linux');

    expect(outcomes).toEqual([
      { status: 'unsupported', id: 'xcode', reason: 'Apple-only tool' },
    ]);
    expect(runner.commands).toEqual([]);
  });

  test('calls onOutcome once per Tool, in execution order', async () => {
    const seen: Outcome[] = [];
    const tools = [tool('brew', 0, recipe()), tool('slack', 3, recipe())];

    await runInstallPlan(tools, createMockRunner(), 'darwin', { onOutcome: (o) => seen.push(o) });

    expect(seen).toEqual([
      { status: 'installed', id: 'brew' },
      { status: 'installed', id: 'slack' },
    ]);
  });

  describe('sudo (issue #8)', () => {
    test('on darwin, no sudo command reaches the Runner, even for a Tool that uses apt on linux', async () => {
      const runner = createMockRunner();
      runner.failOn(['brew', 'list', '--cask', 'docker']);
      const docker = defineTool({
        id: 'docker',
        stage: 3,
        tags: ['apps'],
        darwin: brewCask('docker'),
        linux: apt('docker.io'),
      });

      await runInstallPlan([docker], runner, 'darwin');

      expect(runner.wasRun(['brew', 'install', '--cask', 'docker'])).toBe(true);
      expect(runner.commands.some((command) => command.includes('sudo'))).toBe(false);
    });

    test('on darwin, no sudo session is ever created', async () => {
      const runner = createMockRunner();
      let sessionCreated = false;
      const docker = defineTool({ id: 'docker', stage: 3, tags: ['apps'], darwin: brewCask('docker'), linux: apt('docker.io') });

      await runInstallPlan([docker], runner, 'darwin', {
        createSudoSession: () => {
          sessionCreated = true;
          return fakeSudoSession([]);
        },
      });

      expect(sessionCreated).toBe(false);
    });

    test('on linux, apt commands reach the Runner prefixed with sudo', async () => {
      const runner = createMockRunner();
      runner.failOn(['dpkg-query', '-W', '-f=${Status}', 'docker.io']);
      const docker = defineTool({ id: 'docker', stage: 3, tags: ['apps'], darwin: brewCask('docker'), linux: apt('docker.io') });

      await runInstallPlan([docker], runner, 'linux', { createSudoSession: () => fakeSudoSession([]) });

      expect(runner.wasRun(aptGetInstall('docker.io'))).toBe(true);
    });

    test('on linux with a privileged Tool, the sudo session starts before the plan runs and stops after', async () => {
      const runner = createMockRunner();
      const events: string[] = [];
      const docker = defineTool({ id: 'docker', stage: 3, tags: ['apps'], darwin: brewCask('docker'), linux: apt('docker.io') });

      await runInstallPlan([docker], runner, 'linux', { createSudoSession: () => fakeSudoSession(events) });

      expect(events).toEqual(['start', 'stop']);
    });

    test('on linux, without any apt Tool selected, no sudo session is requested', async () => {
      const runner = createMockRunner();
      let sessionCreated = false;
      const slack = defineTool({ id: 'slack', stage: 3, tags: ['apps'], darwin: brewCask('slack'), linux: unsupported('no official Linux client') });

      await runInstallPlan([slack], runner, 'linux', {
        createSudoSession: () => {
          sessionCreated = true;
          return fakeSudoSession([]);
        },
      });

      expect(sessionCreated).toBe(false);
      expect(runner.commands.some((command) => command.includes('sudo'))).toBe(false);
    });

    test('the sudo session still stops when a Stage 0 failure aborts the plan', async () => {
      const runner = createMockRunner();
      const events: string[] = [];
      const brew = tool(
        'brew',
        0,
        recipe({
          requiresPrivilege: true,
          install: async () => {
            throw new Error('curl failed');
          },
        }),
      );

      await runInstallPlan([brew], runner, 'linux', { createSudoSession: () => fakeSudoSession(events) });

      expect(events).toEqual(['start', 'stop']);
    });
  });

  describe('action: uninstall (issue #11)', () => {
    test('calls uninstall(), not install(), and reports it as "installed" (removed)', async () => {
      let installCalled = false;
      let uninstallCalled = false;
      const tools = [
        tool(
          'slack',
          3,
          recipe({
            isInstalled: async () => true,
            install: async () => {
              installCalled = true;
            },
            uninstall: async () => {
              uninstallCalled = true;
            },
          }),
        ),
      ];

      const outcomes = await runInstallPlan(tools, createMockRunner(), 'darwin', { action: 'uninstall' });

      expect(outcomes).toEqual([{ status: 'installed', id: 'slack' }]);
      expect(uninstallCalled).toBe(true);
      expect(installCalled).toBe(false);
    });

    test('reports "already-installed" (not installed) without calling uninstall()', async () => {
      let uninstallCalled = false;
      const tools = [
        tool(
          'slack',
          3,
          recipe({
            isInstalled: async () => false,
            uninstall: async () => {
              uninstallCalled = true;
            },
          }),
        ),
      ];

      const outcomes = await runInstallPlan(tools, createMockRunner(), 'darwin', { action: 'uninstall' });

      expect(outcomes).toEqual([{ status: 'already-installed', id: 'slack' }]);
      expect(uninstallCalled).toBe(false);
    });

    test('reports a thrown uninstall() as failed', async () => {
      const tools = [
        tool(
          'slack',
          3,
          recipe({
            isInstalled: async () => true,
            uninstall: async () => {
              throw new Error('brew uninstall failed');
            },
          }),
        ),
      ];

      const outcomes = await runInstallPlan(tools, createMockRunner(), 'darwin', { action: 'uninstall' });

      expect(outcomes).toEqual([{ status: 'failed', id: 'slack', error: 'brew uninstall failed' }]);
    });

    test('with direction "desc", tears down in reverse Stage order', async () => {
      const order: string[] = [];
      const uninstall = (id: string) => async () => {
        order.push(id);
      };
      const tools = [
        tool('brew', 0, recipe({ isInstalled: async () => true, uninstall: uninstall('brew') })),
        tool('mise', 1, recipe({ isInstalled: async () => true, uninstall: uninstall('mise') })),
        tool('node', 2, recipe({ isInstalled: async () => true, uninstall: uninstall('node') })),
        tool('slack', 3, recipe({ isInstalled: async () => true, uninstall: uninstall('slack') })),
      ];

      await runInstallPlan(tools, createMockRunner(), 'darwin', { action: 'uninstall', direction: 'desc' });

      expect(order).toEqual(['slack', 'node', 'mise', 'brew']);
    });

    test('a Stage 0 failure is still fatal for uninstall and aborts every later Tool', async () => {
      const ran: string[] = [];
      const tools = [
        tool('mise', 1, recipe({ isInstalled: async () => true, uninstall: async () => { ran.push('mise'); } })),
        tool(
          'brew-a',
          0,
          recipe({
            isInstalled: async () => true,
            uninstall: async () => {
              throw new Error('brew uninstall failed');
            },
          }),
        ),
        tool('brew-b', 0, recipe({ isInstalled: async () => true, uninstall: async () => { ran.push('brew-b'); } })),
      ];

      const outcomes = await runInstallPlan(tools, createMockRunner(), 'darwin', {
        action: 'uninstall',
        direction: 'desc',
      });

      expect(outcomes).toEqual([
        { status: 'installed', id: 'mise' },
        { status: 'failed', id: 'brew-a', error: 'brew uninstall failed' },
      ]);
      expect(ran).toEqual(['mise']);
    });

    test('reports unsupported without touching the Runner or calling uninstall()', async () => {
      const runner = createMockRunner();
      const tools = [tool('xcode', 3, unsupported('Apple-only tool'))];

      const outcomes = await runInstallPlan(tools, runner, 'darwin', { action: 'uninstall' });

      expect(outcomes).toEqual([{ status: 'unsupported', id: 'xcode', reason: 'Apple-only tool' }]);
      expect(runner.commands).toEqual([]);
    });

    test('without an action, defaults to install (backwards-compatible)', async () => {
      let installCalled = false;
      const tools = [tool('slack', 3, recipe({ install: async () => { installCalled = true; } }))];

      await runInstallPlan(tools, createMockRunner(), 'darwin');

      expect(installCalled).toBe(true);
    });

    test('never sends a purge command to the Runner — real apt (linux) and brewCask (darwin) Helpers', async () => {
      const darwinRunner = createMockRunner();
      const docker = defineTool({ id: 'docker', stage: 3, tags: [], darwin: brewCask('docker'), linux: apt('docker.io') });

      await runInstallPlan([docker], darwinRunner, 'darwin', { action: 'uninstall' });

      expect(darwinRunner.wasRun(['brew', 'uninstall', '--cask', 'docker'])).toBe(true);
      expect(
        darwinRunner.commands.some((command) => command.some((arg) => arg.includes('purge') || arg.includes('--zap'))),
      ).toBe(false);

      const linuxRunner = createMockRunner();
      linuxRunner.respondTo(['dpkg-query', '-W', '-f=${Status}', 'docker.io'], { stdout: 'install ok installed' });
      await runInstallPlan([docker], linuxRunner, 'linux', {
        action: 'uninstall',
        createSudoSession: () => fakeSudoSession([]),
      });

      expect(linuxRunner.wasRun(aptGetRemove('docker.io'))).toBe(true);
      expect(
        linuxRunner.commands.some((command) => command.some((arg) => arg.includes('purge') || arg.includes('--zap'))),
      ).toBe(false);
    });
  });

  test('calls onToolStart before the Tool\'s command runs, once per Tool, in execution order', async () => {
    const events: string[] = [];
    const tools = [
      tool('brew', 0, recipe({ install: async () => void events.push('install brew') })),
      tool('slack', 3, recipe({ install: async () => void events.push('install slack') })),
    ];

    await runInstallPlan(tools, createMockRunner(), 'darwin', {
      onToolStart: (t) => events.push(`start ${t.id}`),
      onOutcome: (o) => events.push(`outcome ${o.id}`),
    });

    expect(events).toEqual([
      'start brew',
      'install brew',
      'outcome brew',
      'start slack',
      'install slack',
      'outcome slack',
    ]);
  });

});

describe('runInstallPlan (configuration)', () => {
  const backup = { home: '/home/leo', version: '20260926-143012' };
  const configuration = { root: '/home/leo', files: [{ path: '.zshrc', content: 'managed\n' }] };
  const writeZshrc = ['sh', '-c', 'mkdir -p "$(dirname "$2")" && printf "%s" "$1" > "$2"', 'sh', 'managed\n', '/home/leo/.zshrc'];
  const zshrcMatches = ['sh', '-c', 'printf "%s" "$1" | cmp -s - "$2"', 'sh', 'managed\n', '/home/leo/.zshrc'];

  function configuredTool(entry: Recipe | ReturnType<typeof unsupported> = recipe()): Tool {
    return defineTool({ id: 'zsh', stage: 3, tags: [], darwin: entry, linux: entry, configuration });
  }

  test('configures a Tool right after installing it', async () => {
    const events: string[] = [];
    const runner = createMockRunner();
    runner.failOn(zshrcMatches);
    const zsh = configuredTool(recipe({ install: async () => void events.push('install') }));

    const outcomes = await runInstallPlan([zsh], runner, 'darwin', {
      backup,
      onOutcome: () => events.push('outcome'),
    });

    expect(outcomes).toEqual([{ status: 'installed', id: 'zsh', configuration: 'applied' }]);
    expect(runner.wasRun(writeZshrc)).toBe(true);
    expect(events).toEqual(['install', 'outcome']);
  });

  test('moves what the Configuration replaces into the run\'s backup before writing', async () => {
    const runner = createMockRunner();
    runner.failOn(zshrcMatches);
    const zsh = configuredTool(recipe({ isInstalled: async () => true }));

    await runInstallPlan([zsh], runner, 'darwin', { backup });

    const moveAside = runner.commands.findIndex((command) =>
      command.includes('/home/leo/.0xshell/backups/20260926-143012/files/.zshrc'),
    );
    expect(moveAside).toBeGreaterThan(-1);
    expect(moveAside).toBeLessThan(runner.commands.findIndex((command) => command.join(' ') === writeZshrc.join(' ')));
  });

  test('fails a Tool it cannot back up instead of overwriting without a backup', async () => {
    const runner = createMockRunner();
    runner.failOn(zshrcMatches);
    const zsh = configuredTool(recipe({ isInstalled: async () => true }));

    const outcomes = await runInstallPlan([zsh], runner, 'darwin');

    expect(outcomes[0]).toMatchObject({ status: 'failed', id: 'zsh' });
    expect(runner.wasRun(writeZshrc)).toBe(false);
  });

  test('configures a Tool that was already installed', async () => {
    const runner = createMockRunner();
    runner.failOn(zshrcMatches);
    const zsh = configuredTool(recipe({ isInstalled: async () => true }));

    const outcomes = await runInstallPlan([zsh], runner, 'darwin', { backup });

    expect(outcomes).toEqual([{ status: 'already-installed', id: 'zsh', configuration: 'applied' }]);
    expect(runner.wasRun(writeZshrc)).toBe(true);
  });

  test('reports an up-to-date configuration as unchanged without writing', async () => {
    const runner = createMockRunner();
    const zsh = configuredTool(recipe({ isInstalled: async () => true }));

    const outcomes = await runInstallPlan([zsh], runner, 'darwin', { backup });

    expect(outcomes).toEqual([{ status: 'already-installed', id: 'zsh', configuration: 'unchanged' }]);
    expect(runner.wasRun(writeZshrc)).toBe(false);
  });

  test('a configuration failure fails the Tool with its own reason and the plan carries on', async () => {
    const runner = createMockRunner();
    runner.failOn(zshrcMatches);
    runner.failOn(writeZshrc, { stderr: 'Permission denied' });
    const zsh = configuredTool();

    const outcomes = await runInstallPlan([zsh, tool('slack', 3)], runner, 'darwin', { backup });

    expect(outcomes[0]).toMatchObject({ status: 'failed', id: 'zsh' });
    expect(outcomes[0]?.status === 'failed' && outcomes[0].error).toStartWith('configuration failed:');
    expect(outcomes[1]).toEqual({ status: 'installed', id: 'slack' });
  });

  test('does not configure a Tool whose install failed', async () => {
    const runner = createMockRunner();
    const zsh = configuredTool(
      recipe({
        install: async () => {
          throw new Error('brew failed');
        },
      }),
    );

    await runInstallPlan([zsh], runner, 'darwin', { backup });

    expect(runner.commands).toEqual([]);
  });

  test('uninstall never touches configuration', async () => {
    const runner = createMockRunner();
    const zsh = configuredTool(recipe({ isInstalled: async () => true }));

    const outcomes = await runInstallPlan([zsh], runner, 'darwin', { action: 'uninstall' });

    expect(outcomes).toEqual([{ status: 'installed', id: 'zsh' }]);
    expect(runner.commands).toEqual([]);
  });

  test('does not configure a Tool that is unsupported on the Platform', async () => {
    const runner = createMockRunner();
    const zsh = defineTool({
      id: 'zsh',
      stage: 3,
      tags: [],
      darwin: recipe(),
      linux: unsupported('no recipe'),
      configuration,
    });

    await runInstallPlan([zsh], runner, 'linux', { backup });

    expect(runner.commands).toEqual([]);
  });
});
