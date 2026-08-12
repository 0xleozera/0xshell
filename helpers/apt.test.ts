import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../runner/mock-runner';
import { apt } from './apt';

describe('apt', () => {
  test('install() runs apt install -y <package>', async () => {
    const runner = new MockRunner();

    await apt('ripgrep').install(runner);

    expect(runner.wasRun(['apt', 'install', '-y', 'ripgrep'])).toBe(true);
  });

  test('uninstall() runs apt remove -y <package>', async () => {
    const runner = new MockRunner();

    await apt('ripgrep').uninstall(runner);

    expect(runner.wasRun(['apt', 'remove', '-y', 'ripgrep'])).toBe(true);
  });

  test('isInstalled() reflects the exit code of dpkg -s <package>', async () => {
    const runner = new MockRunner();
    runner.respondTo(['dpkg', '-s', 'ripgrep'], { exitCode: 0 });

    expect(await apt('ripgrep').isInstalled(runner)).toBe(true);
  });

  test('isInstalled() is false when dpkg -s <package> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['dpkg', '-s', 'ripgrep']);

    expect(await apt('ripgrep').isInstalled(runner)).toBe(false);
  });

  test('install() rejects when apt install -y <package> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['apt', 'install', '-y', 'ripgrep']);

    await expect(apt('ripgrep').install(runner)).rejects.toThrow();
  });

  test('uninstall() rejects when apt remove -y <package> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['apt', 'remove', '-y', 'ripgrep']);

    await expect(apt('ripgrep').uninstall(runner)).rejects.toThrow();
  });
});
