import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import node from './node';

describe('node tool', () => {
  test('darwin installs via mise', async () => {
    const runner = new MockRunner();

    await node.darwin.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'node']]);
  });

  test('linux installs via mise', async () => {
    const runner = new MockRunner();

    await node.linux.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'node']]);
  });
});
