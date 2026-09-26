import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import claudeCode from './claude-code';

describe('claude-code tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = createMockRunner();

    await claudeCode.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'claude-code']]);
  });

  test('linux pipes the official install script into bash', async () => {
    const runner = createMockRunner();

    await claudeCode.linux.install(runner);

    expect(runner.commands).toEqual([['bash', '-c', 'set -o pipefail; curl -fsSL https://claude.ai/install.sh | bash']]);
  });
});
