import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import bun from './bun';

describe('bun tool', () => {
  test('darwin installs via mise', async () => {
    const runner = createMockRunner();

    await bun.darwin.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'bun']]);
  });

  test('linux installs via mise', async () => {
    const runner = createMockRunner();

    await bun.linux.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'bun']]);
  });
});
