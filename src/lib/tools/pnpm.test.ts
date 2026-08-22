import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import pnpm from './pnpm';

describe('pnpm tool', () => {
  test('darwin installs via mise', async () => {
    const runner = createMockRunner();

    await pnpm.darwin.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'pnpm']]);
  });

  test('linux installs via mise', async () => {
    const runner = createMockRunner();

    await pnpm.linux.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'pnpm']]);
  });
});
