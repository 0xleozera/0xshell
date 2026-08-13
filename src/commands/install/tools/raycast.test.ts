import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import raycast from './raycast';

describe('raycast tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = new MockRunner();

    await raycast.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'raycast']]);
  });

  test('linux is unsupported, reported with a reason', () => {
    expect(raycast.linux).toEqual({ unsupported: true, reason: 'sem cliente Linux, apenas macOS' });
  });
});
