import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import yarn from './yarn';

describe('yarn tool', () => {
  test('darwin installs via mise', async () => {
    const runner = createMockRunner();

    await yarn.darwin.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'yarn']]);
  });

  test('linux installs via mise', async () => {
    const runner = createMockRunner();

    await yarn.linux.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'yarn']]);
  });
});
