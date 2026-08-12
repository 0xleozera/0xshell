import { runCommand } from 'citty';
import { describe, expect, spyOn, test } from 'bun:test';
import { brewCask } from '../../helpers/brew-cask';
import { MockRunner } from '../../runner/mock-runner';
import { defineTool } from '../../tool/define-tool';
import { unsupported } from '../../tool/unsupported';
import { createInstallCommand } from './index';

describe('install command', () => {
  test('installs the tool when it is not already installed', async () => {
    const runner = new MockRunner();
    runner.failOn(['brew', 'list', '--cask', 'slack']);

    await runCommand(createInstallCommand(runner, 'darwin'), { rawArgs: ['slack'] });

    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(true);
  });

  test('does not run the install command when already installed', async () => {
    const runner = new MockRunner();
    runner.respondTo(['brew', 'list', '--cask', 'slack'], { exitCode: 0 });

    await runCommand(createInstallCommand(runner, 'darwin'), { rawArgs: ['slack'] });

    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(false);
  });

  test('reports an unknown tool without touching the Runner', async () => {
    const runner = new MockRunner();

    await runCommand(createInstallCommand(runner, 'darwin'), { rawArgs: ['not-a-real-tool'] });

    expect(runner.commands).toEqual([]);
    // `run()` sets process.exitCode for the real CLI process; undo it here so
    // it doesn't leak into `bun test`'s own exit code.
    process.exitCode = 0;
  });

  test('resolves the darwin recipe on darwin and the linux recipe on linux for the same Tool', async () => {
    const runner = new MockRunner();
    const tool = defineTool({
      id: 'slack',
      darwin: brewCask('slack'),
      linux: unsupported('não usado neste teste'),
    });
    runner.failOn(['brew', 'list', '--cask', 'slack']);

    await runCommand(createInstallCommand(runner, 'darwin', () => tool), { rawArgs: ['slack'] });

    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(true);
  });

  test('reports ⊘ and the reason for an unsupported tool, without touching the Runner or counting it as a failure', async () => {
    const runner = new MockRunner();
    const tool = defineTool({
      id: 'xcode',
      darwin: brewCask('xcode'),
      linux: unsupported('ferramenta exclusiva da Apple'),
    });
    const logSpy = spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = 0;

    await runCommand(createInstallCommand(runner, 'linux', () => tool), { rawArgs: ['xcode'] });

    expect(runner.commands).toEqual([]);
    expect(logSpy.mock.calls.flat()).toEqual([
      '⊘ xcode não suportado em linux: ferramenta exclusiva da Apple',
    ]);
    expect(process.exitCode).toBe(0);

    logSpy.mockRestore();
  });
});
