import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import { brewFormula } from './brew-formula';

describe('brewFormula', () => {
  test('install() runs brew install <formula>', async () => {
    const runner = createMockRunner();

    await brewFormula('git').install(runner);

    expect(runner.wasRun(['brew', 'install', 'git'])).toBe(true);
  });

  test('uninstall() runs brew uninstall <formula>', async () => {
    const runner = createMockRunner();

    await brewFormula('git').uninstall(runner);

    expect(runner.wasRun(['brew', 'uninstall', 'git'])).toBe(true);
  });

  test('isInstalled() reflects the exit code of brew list <formula>', async () => {
    const runner = createMockRunner();
    runner.respondTo(['brew', 'list', 'git'], { exitCode: 0 });

    expect(await brewFormula('git').isInstalled(runner)).toBe(true);
  });

  test('isInstalled() is false when brew list <formula> fails', async () => {
    const runner = createMockRunner();
    runner.failOn(['brew', 'list', 'git']);

    expect(await brewFormula('git').isInstalled(runner)).toBe(false);
  });

  test('install() rejects when brew install <formula> fails', async () => {
    const runner = createMockRunner();
    runner.failOn(['brew', 'install', 'git']);

    await expect(brewFormula('git').install(runner)).rejects.toThrow();
  });

  test('uninstall() rejects when brew uninstall <formula> fails', async () => {
    const runner = createMockRunner();
    runner.failOn(['brew', 'uninstall', 'git']);

    await expect(brewFormula('git').uninstall(runner)).rejects.toThrow();
  });
});
