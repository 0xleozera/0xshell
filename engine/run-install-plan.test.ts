import { describe, expect, test } from 'bun:test';
import { apt } from '../helpers/apt';
import { brewCask } from '../helpers/brew-cask';
import { MockRunner } from '../runner/mock-runner';
import type { SudoSession } from '../sudo/session';
import { defineTool, type Tool } from '../tool/define-tool';
import type { Recipe } from '../tool/recipe';
import { unsupported } from '../tool/unsupported';
import type { Outcome } from './outcome';
import { runInstallPlan } from './run-install-plan';

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

    await runInstallPlan(tools, new MockRunner(), 'darwin');

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

    await runInstallPlan(tools, new MockRunner(), 'darwin');

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
            throw new Error('curl falhou');
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

    const outcomes = await runInstallPlan(tools, new MockRunner(), 'darwin');

    expect(outcomes).toEqual([{ status: 'failed', id: 'brew', error: 'curl falhou' }]);
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

    const outcomes = await runInstallPlan(tools, new MockRunner(), 'darwin');

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

    const outcomes = await runInstallPlan(tools, new MockRunner(), 'darwin');

    expect(outcomes).toEqual([{ status: 'already-installed', id: 'git' }]);
    expect(installCalled).toBe(false);
  });

  test('reports unsupported without touching the Runner', async () => {
    const runner = new MockRunner();
    const tools = [tool('xcode', 3, unsupported('ferramenta exclusiva da Apple'))];

    const outcomes = await runInstallPlan(tools, runner, 'linux');

    expect(outcomes).toEqual([
      { status: 'unsupported', id: 'xcode', reason: 'ferramenta exclusiva da Apple' },
    ]);
    expect(runner.commands).toEqual([]);
  });

  test('calls onOutcome once per Tool, in execution order', async () => {
    const seen: Outcome[] = [];
    const tools = [tool('brew', 0, recipe()), tool('slack', 3, recipe())];

    await runInstallPlan(tools, new MockRunner(), 'darwin', { onOutcome: (o) => seen.push(o) });

    expect(seen).toEqual([
      { status: 'installed', id: 'brew' },
      { status: 'installed', id: 'slack' },
    ]);
  });

  describe('sudo (issue #8)', () => {
    test('on darwin, no sudo command reaches the Runner, even for a Tool that uses apt on linux', async () => {
      const runner = new MockRunner();
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
      const runner = new MockRunner();
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
      const runner = new MockRunner();
      runner.failOn(['dpkg', '-s', 'docker.io']);
      const docker = defineTool({ id: 'docker', stage: 3, tags: ['apps'], darwin: brewCask('docker'), linux: apt('docker.io') });

      await runInstallPlan([docker], runner, 'linux', { createSudoSession: () => fakeSudoSession([]) });

      expect(runner.wasRun(['sudo', 'apt', 'install', '-y', 'docker.io'])).toBe(true);
    });

    test('on linux with a privileged Tool, the sudo session starts before the plan runs and stops after', async () => {
      const runner = new MockRunner();
      const events: string[] = [];
      const docker = defineTool({ id: 'docker', stage: 3, tags: ['apps'], darwin: brewCask('docker'), linux: apt('docker.io') });

      await runInstallPlan([docker], runner, 'linux', { createSudoSession: () => fakeSudoSession(events) });

      expect(events).toEqual(['start', 'stop']);
    });

    test('on linux, without any apt Tool selected, no sudo session is requested', async () => {
      const runner = new MockRunner();
      let sessionCreated = false;
      const slack = defineTool({ id: 'slack', stage: 3, tags: ['apps'], darwin: brewCask('slack'), linux: unsupported('sem cliente Linux oficial') });

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
      const runner = new MockRunner();
      const events: string[] = [];
      const brew = tool(
        'brew',
        0,
        recipe({
          requiresPrivilege: true,
          install: async () => {
            throw new Error('curl falhou');
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

      const outcomes = await runInstallPlan(tools, new MockRunner(), 'darwin', { action: 'uninstall' });

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

      const outcomes = await runInstallPlan(tools, new MockRunner(), 'darwin', { action: 'uninstall' });

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
              throw new Error('brew uninstall falhou');
            },
          }),
        ),
      ];

      const outcomes = await runInstallPlan(tools, new MockRunner(), 'darwin', { action: 'uninstall' });

      expect(outcomes).toEqual([{ status: 'failed', id: 'slack', error: 'brew uninstall falhou' }]);
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

      await runInstallPlan(tools, new MockRunner(), 'darwin', { action: 'uninstall', direction: 'desc' });

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
              throw new Error('brew uninstall falhou');
            },
          }),
        ),
        tool('brew-b', 0, recipe({ isInstalled: async () => true, uninstall: async () => { ran.push('brew-b'); } })),
      ];

      const outcomes = await runInstallPlan(tools, new MockRunner(), 'darwin', {
        action: 'uninstall',
        direction: 'desc',
      });

      expect(outcomes).toEqual([
        { status: 'installed', id: 'mise' },
        { status: 'failed', id: 'brew-a', error: 'brew uninstall falhou' },
      ]);
      expect(ran).toEqual(['mise']);
    });

    test('reports unsupported without touching the Runner or calling uninstall()', async () => {
      const runner = new MockRunner();
      const tools = [tool('xcode', 3, unsupported('ferramenta exclusiva da Apple'))];

      const outcomes = await runInstallPlan(tools, runner, 'darwin', { action: 'uninstall' });

      expect(outcomes).toEqual([{ status: 'unsupported', id: 'xcode', reason: 'ferramenta exclusiva da Apple' }]);
      expect(runner.commands).toEqual([]);
    });

    test('without an action, defaults to install (backwards-compatible)', async () => {
      let installCalled = false;
      const tools = [tool('slack', 3, recipe({ install: async () => { installCalled = true; } }))];

      await runInstallPlan(tools, new MockRunner(), 'darwin');

      expect(installCalled).toBe(true);
    });

    test('never sends a purge command to the Runner — real apt (linux) and brewCask (darwin) Helpers', async () => {
      const darwinRunner = new MockRunner();
      const docker = defineTool({ id: 'docker', stage: 3, tags: [], darwin: brewCask('docker'), linux: apt('docker.io') });

      await runInstallPlan([docker], darwinRunner, 'darwin', { action: 'uninstall' });

      expect(darwinRunner.wasRun(['brew', 'uninstall', '--cask', 'docker'])).toBe(true);
      expect(
        darwinRunner.commands.some((command) => command.some((arg) => arg.includes('purge') || arg.includes('--zap'))),
      ).toBe(false);

      const linuxRunner = new MockRunner();
      await runInstallPlan([docker], linuxRunner, 'linux', {
        action: 'uninstall',
        createSudoSession: () => fakeSudoSession([]),
      });

      expect(linuxRunner.wasRun(['sudo', 'apt', 'remove', '-y', 'docker.io'])).toBe(true);
      expect(
        linuxRunner.commands.some((command) => command.some((arg) => arg.includes('purge') || arg.includes('--zap'))),
      ).toBe(false);
    });
  });
});
