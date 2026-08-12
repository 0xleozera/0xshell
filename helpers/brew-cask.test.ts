import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../runner/mock-runner';
import { brewCask } from './brew-cask';

describe('brewCask', () => {
  test('install() runs brew install --cask <id>', async () => {
    const runner = new MockRunner();

    await brewCask('slack').install(runner);

    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(true);
  });

  test('uninstall() runs brew uninstall --cask <id>', async () => {
    const runner = new MockRunner();

    await brewCask('slack').uninstall(runner);

    expect(runner.wasRun(['brew', 'uninstall', '--cask', 'slack'])).toBe(true);
  });

  test('isInstalled() reflects the exit code of brew list --cask <id>', async () => {
    const runner = new MockRunner();
    runner.respondTo(['brew', 'list', '--cask', 'slack'], { exitCode: 0 });

    expect(await brewCask('slack').isInstalled(runner)).toBe(true);
  });

  test('isInstalled() is false when brew list --cask <id> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['brew', 'list', '--cask', 'slack']);

    expect(await brewCask('slack').isInstalled(runner)).toBe(false);
  });
});
