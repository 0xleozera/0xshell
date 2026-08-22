import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import node from './node';

describe('node tool', () => {
  test('darwin installs via mise', async () => {
    const runner = createMockRunner();

    await node.darwin.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'node']]);
  });

  test('linux installs via mise', async () => {
    const runner = createMockRunner();

    await node.linux.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'node']]);
  });
});
