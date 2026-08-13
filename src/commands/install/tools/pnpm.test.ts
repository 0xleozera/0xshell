import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import pnpm from './pnpm';

describe('pnpm tool', () => {
  test('darwin installs via mise', async () => {
    const runner = new MockRunner();

    await pnpm.darwin.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'pnpm']]);
  });

  test('linux installs via mise', async () => {
    const runner = new MockRunner();

    await pnpm.linux.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'pnpm']]);
  });
});
