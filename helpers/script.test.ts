import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../runner/mock-runner';
import { script } from './script';

const options = {
  url: 'https://example.com/install.sh',
  uninstallCommand: ['rm', '-f', '/usr/local/bin/orca'],
  binName: 'orca',
};

describe('script', () => {
  test('install() pipes the remote script into sh', async () => {
    const runner = new MockRunner();

    await script(options).install(runner);

    expect(runner.wasRun(['sh', '-c', `curl -fsSL ${options.url} | sh`])).toBe(true);
  });

  test('uninstall() runs the caller-supplied uninstall command', async () => {
    const runner = new MockRunner();

    await script(options).uninstall(runner);

    expect(runner.wasRun(options.uninstallCommand)).toBe(true);
  });

  test('isInstalled() reflects command -v <bin>', async () => {
    const runner = new MockRunner();
    runner.respondTo(['sh', '-c', `command -v ${options.binName}`], { exitCode: 0 });

    expect(await script(options).isInstalled(runner)).toBe(true);
  });

  test('isInstalled() is false when command -v <bin> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['sh', '-c', `command -v ${options.binName}`]);

    expect(await script(options).isInstalled(runner)).toBe(false);
  });
});
