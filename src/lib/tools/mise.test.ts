import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import mise from './mise';

describe('mise tool', () => {
  test('darwin pipes mise.run into bash', async () => {
    const runner = createMockRunner();

    await mise.darwin.install(runner);

    expect(runner.commands).toEqual([['bash', '-c', 'set -o pipefail; curl -fsSL https://mise.run | bash']]);
  });

  test('linux uses the same universal installer as darwin', async () => {
    const runner = createMockRunner();

    await mise.linux.install(runner);

    expect(runner.commands).toEqual([['bash', '-c', 'set -o pipefail; curl -fsSL https://mise.run | bash']]);
  });
});
