import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import claudeCode from './claude-code';

describe('claude-code tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = new MockRunner();

    await claudeCode.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'claude-code']]);
  });

  test('linux pipes the official install script into sh', async () => {
    const runner = new MockRunner();

    await claudeCode.linux.install(runner);

    expect(runner.commands).toEqual([['sh', '-c', 'curl -fsSL https://claude.ai/install.sh | sh']]);
  });
});
