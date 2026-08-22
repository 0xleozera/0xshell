import { describe, expect, test } from 'bun:test';
import { createMockRunner } from './mock-runner';

describe('MockRunner', () => {
  test('records every command it runs', async () => {
    const runner = createMockRunner();

    await runner.run(['brew', 'install', '--cask', 'slack']);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'slack']]);
    expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(true);
    expect(runner.wasRun(['brew', 'install', '--cask', 'zoom'])).toBe(false);
  });

  test('defaults to a successful, empty result for unprogrammed commands', async () => {
    const runner = createMockRunner();

    const result = await runner.run(['brew', 'list', '--cask', 'slack']);

    expect(result).toEqual({ exitCode: 0, stdout: '', stderr: '' });
  });

  test('respondTo programs the result for an exact command', async () => {
    const runner = createMockRunner();
    runner.respondTo(['brew', 'list', '--cask', 'slack'], { stdout: 'slack\n' });

    const result = await runner.run(['brew', 'list', '--cask', 'slack']);

    expect(result).toEqual({ exitCode: 0, stdout: 'slack\n', stderr: '' });
  });

  test('failOn programs a non-zero exit code', async () => {
    const runner = createMockRunner();
    runner.failOn(['brew', 'list', '--cask', 'slack'], { stderr: 'No Cask' });

    const result = await runner.run(['brew', 'list', '--cask', 'slack']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('No Cask');
  });
});
