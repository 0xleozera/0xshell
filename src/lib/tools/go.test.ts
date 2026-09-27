import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import go from './go';

describe('go tool', () => {
  test('darwin installs via mise', async () => {
    const runner = createMockRunner();

    await go.darwin.install(runner);

    expect(runner.commands).toEqual([['mise', 'use', '--global', 'go@latest']]);
  });

  test('linux installs via mise', async () => {
    const runner = createMockRunner();

    await go.linux.install(runner);

    expect(runner.commands).toEqual([['mise', 'use', '--global', 'go@latest']]);
  });
});
