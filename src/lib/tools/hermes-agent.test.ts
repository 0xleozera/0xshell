import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import hermesAgent from './hermes-agent';

describe('hermes-agent tool', () => {
  test('runs the official installer non-interactively, as the login shell', async () => {
    const runner = createMockRunner();

    await hermesAgent.linux.install(runner);

    const [command] = runner.commands;
    expect(command?.slice(0, 2)).toEqual(['bash', '-c']);
    expect(command?.[2]).toStartWith('set -o pipefail; login=$(');
    expect(command?.[2]).toContain('getent passwd');
    expect(command?.[2]).toEndWith(
      'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | ' +
        'SHELL="${login:-$SHELL}" npm_config_cache="$HOME/.hermes/cache/npm" bash -s -- --non-interactive',
    );
  });

  test('uninstall drops the PATH block the installer added, then runs hermes uninstall keeping ~/.hermes', async () => {
    const runner = createMockRunner();

    await hermesAgent.linux.uninstall(runner);

    expect(runner.commands[0]?.[2]).toContain('# Hermes Agent command');
    expect(runner.commands[0]?.[2]).toContain('"$HOME/.bashrc"');
    expect(runner.commands[1]).toEqual(['hermes', 'uninstall', '--yes']);
  });

  test('is installed when the hermes command is on the PATH', async () => {
    const runner = createMockRunner();
    runner.failOn(['sh', '-c', 'command -v hermes']);

    expect(await hermesAgent.linux.isInstalled(runner)).toBe(false);
  });

  test('uses the same installer on macOS', () => {
    expect(hermesAgent.darwin).toBe(hermesAgent.linux);
  });
});
