import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import bun from './bun';

describe('bun tool', () => {
  test('darwin installs via mise', async () => {
    const runner = new MockRunner();

    await bun.darwin.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'bun']]);
  });

  test('linux installs via mise', async () => {
    const runner = new MockRunner();

    await bun.linux.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'bun']]);
  });
});
