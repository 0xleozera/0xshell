import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import { script } from './script';

const options = {
  url: 'https://example.com/install.sh',
  uninstallCommand: ['rm', '-f', '/usr/local/bin/orca'],
  binName: 'orca',
};

describe('script', () => {
  test('install() pipes the remote script into bash', async () => {
    const runner = createMockRunner();

    await script(options).install(runner);

    expect(runner.wasRun(['bash', '-c', `set -o pipefail; curl -fsSL ${options.url} | bash`])).toBe(true);
  });

  test('uninstall() runs the caller-supplied uninstall command', async () => {
    const runner = createMockRunner();

    await script(options).uninstall(runner);

    expect(runner.wasRun(options.uninstallCommand)).toBe(true);
  });

  test('isInstalled() reflects command -v <bin>', async () => {
    const runner = createMockRunner();
    runner.respondTo(['sh', '-c', `command -v ${options.binName}`], { exitCode: 0 });

    expect(await script(options).isInstalled(runner)).toBe(true);
  });

  test('isInstalled() is false when command -v <bin> fails', async () => {
    const runner = createMockRunner();
    runner.failOn(['sh', '-c', `command -v ${options.binName}`]);

    expect(await script(options).isInstalled(runner)).toBe(false);
  });

  test('install() rejects when the remote script fails', async () => {
    const runner = createMockRunner();
    runner.failOn(['bash', '-c', `set -o pipefail; curl -fsSL ${options.url} | bash`]);

    await expect(script(options).install(runner)).rejects.toThrow();
  });

  test('uninstall() rejects when the uninstall command fails', async () => {
    const runner = createMockRunner();
    runner.failOn(options.uninstallCommand);

    await expect(script(options).uninstall(runner)).rejects.toThrow();
  });
});
