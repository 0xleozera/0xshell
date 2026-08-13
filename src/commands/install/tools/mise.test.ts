import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import mise from './mise';

describe('mise tool', () => {
  test('darwin pipes mise.run into sh', async () => {
    const runner = new MockRunner();

    await mise.darwin.install(runner);

    expect(runner.commands).toEqual([['sh', '-c', 'curl -fsSL https://mise.run | sh']]);
  });

  test('linux uses the same universal installer as darwin', async () => {
    const runner = new MockRunner();

    await mise.linux.install(runner);

    expect(runner.commands).toEqual([['sh', '-c', 'curl -fsSL https://mise.run | sh']]);
  });
});
