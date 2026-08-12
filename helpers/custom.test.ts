import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../runner/mock-runner';
import { custom } from './custom';

describe('custom', () => {
  test('install() delegates to the supplied function, with the given Runner', async () => {
    const runner = new MockRunner();
    let receivedRunner: unknown;

    await custom({
      install: async (r) => {
        receivedRunner = r;
        await r.run(['echo', 'installed']);
      },
      uninstall: async () => {},
      isInstalled: async () => true,
    }).install(runner);

    expect(receivedRunner).toBe(runner);
    expect(runner.wasRun(['echo', 'installed'])).toBe(true);
  });

  test('uninstall() delegates to the supplied function', async () => {
    const runner = new MockRunner();

    await custom({
      install: async () => {},
      uninstall: async (r) => {
        await r.run(['echo', 'uninstalled']);
      },
      isInstalled: async () => false,
    }).uninstall(runner);

    expect(runner.wasRun(['echo', 'uninstalled'])).toBe(true);
  });

  test('isInstalled() delegates to the supplied function', async () => {
    const runner = new MockRunner();

    const installed = await custom({
      install: async () => {},
      uninstall: async () => {},
      isInstalled: async () => true,
    }).isInstalled(runner);

    expect(installed).toBe(true);
  });
});
