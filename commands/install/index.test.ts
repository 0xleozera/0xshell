import { runCommand } from 'citty';
import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../runner/mock-runner';
import { createInstallCommand } from './index';

describe('install command', () => {
  test('installs the tool when it is not already installed', async () => {
    const runner = new MockRunner();
    runner.failOn(['brew', 'list', '--cask', 'slack']);

    await runCommand(createInstallCommand(runner), { rawArgs: ['slack'] });

    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(true);
  });

  test('does not run the install command when already installed', async () => {
    const runner = new MockRunner();
    runner.respondTo(['brew', 'list', '--cask', 'slack'], { exitCode: 0 });

    await runCommand(createInstallCommand(runner), { rawArgs: ['slack'] });

    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(false);
  });

  test('reports an unknown tool without touching the Runner', async () => {
    const runner = new MockRunner();

    await runCommand(createInstallCommand(runner), { rawArgs: ['not-a-real-tool'] });

    expect(runner.commands).toEqual([]);
    // `run()` sets process.exitCode for the real CLI process; undo it here so
    // it doesn't leak into `bun test`'s own exit code.
    process.exitCode = 0;
  });
});
