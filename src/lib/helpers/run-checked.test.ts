import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import { runChecked } from './run-checked';

describe('runChecked', () => {
  test('resolves without throwing when the command exits 0', async () => {
    const runner = createMockRunner();

    await expect(runChecked(runner, ['brew', 'install', 'git'])).resolves.toBeUndefined();
  });

  test('throws when the command exits non-zero', async () => {
    const runner = createMockRunner();
    runner.failOn(['brew', 'install', 'git']);

    await expect(runChecked(runner, ['brew', 'install', 'git'])).rejects.toThrow();
  });

  test('the thrown error includes the command and stderr', async () => {
    const runner = createMockRunner();
    runner.failOn(['brew', 'install', 'git'], { stderr: 'Error: No available formula' });

    await expect(runChecked(runner, ['brew', 'install', 'git'])).rejects.toThrow(
      /brew install git.*No available formula/s,
    );
  });
});
