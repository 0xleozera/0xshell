import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import { brewCask } from './brew-cask';

describe('brewCask', () => {
  test('install() runs brew install --cask <id>', async () => {
    const runner = createMockRunner();

    await brewCask('slack').install(runner);

    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(true);
  });

  test('uninstall() runs brew uninstall --cask <id>', async () => {
    const runner = createMockRunner();

    await brewCask('slack').uninstall(runner);

    expect(runner.wasRun(['brew', 'uninstall', '--cask', 'slack'])).toBe(true);
  });

  test('isInstalled() reflects the exit code of brew list --cask <id>', async () => {
    const runner = createMockRunner();
    runner.respondTo(['brew', 'list', '--cask', 'slack'], { exitCode: 0 });

    expect(await brewCask('slack').isInstalled(runner)).toBe(true);
  });

  test('isInstalled() is false when brew list --cask <id> fails', async () => {
    const runner = createMockRunner();
    runner.failOn(['brew', 'list', '--cask', 'slack']);

    expect(await brewCask('slack').isInstalled(runner)).toBe(false);
  });

  test('install() accepts a tap-qualified cask id', async () => {
    const runner = createMockRunner();

    await brewCask('stablyai/orca/orca').install(runner);

    expect(runner.wasRun(['brew', 'install', '--cask', 'stablyai/orca/orca'])).toBe(true);
  });

  test('uninstall() accepts a tap-qualified cask id', async () => {
    const runner = createMockRunner();

    await brewCask('stablyai/orca/orca').uninstall(runner);

    expect(runner.wasRun(['brew', 'uninstall', '--cask', 'stablyai/orca/orca'])).toBe(true);
  });

  test('isInstalled() accepts a tap-qualified cask id', async () => {
    const runner = createMockRunner();
    runner.respondTo(['brew', 'list', '--cask', 'stablyai/orca/orca'], { exitCode: 0 });

    expect(await brewCask('stablyai/orca/orca').isInstalled(runner)).toBe(true);
  });

  test('install() rejects when brew install --cask <id> fails', async () => {
    const runner = createMockRunner();
    runner.failOn(['brew', 'install', '--cask', 'slack']);

    await expect(brewCask('slack').install(runner)).rejects.toThrow();
  });

  test('uninstall() rejects when brew uninstall --cask <id> fails', async () => {
    const runner = createMockRunner();
    runner.failOn(['brew', 'uninstall', '--cask', 'slack']);

    await expect(brewCask('slack').uninstall(runner)).rejects.toThrow();
  });
});
