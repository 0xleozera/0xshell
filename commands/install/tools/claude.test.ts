import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import claude from './claude';

describe('claude tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = new MockRunner();

    await claude.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'claude']]);
  });

  test('linux is unsupported, reported with a reason', () => {
    expect(claude.linux).toEqual({ unsupported: true, reason: 'app desktop sem cliente Linux oficial' });
  });
});
