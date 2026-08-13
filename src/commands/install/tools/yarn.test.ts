import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import yarn from './yarn';

describe('yarn tool', () => {
  test('darwin installs via mise', async () => {
    const runner = new MockRunner();

    await yarn.darwin.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'yarn']]);
  });

  test('linux installs via mise', async () => {
    const runner = new MockRunner();

    await yarn.linux.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'yarn']]);
  });
});
