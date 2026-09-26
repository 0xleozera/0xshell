import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import homebrew from './homebrew';

describe('homebrew tool', () => {
  test('darwin pipes the official install script into bash', async () => {
    const runner = createMockRunner();

    await homebrew.darwin.install(runner);

    expect(runner.commands).toEqual([
      ['bash', '-c', 'set -o pipefail; curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | bash'],
    ]);
  });

  test('darwin isInstalled checks the brew binary on PATH, not brew list', async () => {
    const runner = createMockRunner();
    runner.respondTo(['sh', '-c', 'command -v brew'], { exitCode: 0 });

    const installed = await homebrew.darwin.isInstalled(runner);

    expect(installed).toBe(true);
    expect(runner.commands).toEqual([['sh', '-c', 'command -v brew']]);
  });

  test('linux is unsupported because apt already ships with the system', () => {
    expect(homebrew.linux).toEqual({ unsupported: true, reason: 'apt already ships with the system' });
  });
});
