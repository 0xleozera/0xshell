import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import go from './go';

describe('go tool', () => {
  test('darwin installs via mise', async () => {
    const runner = new MockRunner();

    await go.darwin.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'go']]);
  });

  test('linux installs via mise', async () => {
    const runner = new MockRunner();

    await go.linux.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'go']]);
  });
});
