import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import claude from './claude';

describe('claude tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = createMockRunner();

    await claude.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'claude']]);
  });

  test('linux is unsupported, reported with a reason', () => {
    expect(claude.linux).toEqual({ unsupported: true, reason: 'desktop app with no official Linux client' });
  });
});
