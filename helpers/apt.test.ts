import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../runner/mock-runner';
import { apt } from './apt';

describe('apt', () => {
  test('declares that it requires privilege', () => {
    expect(apt('ripgrep').requiresPrivilege).toBe(true);
  });

  test('install() runs sudo apt install -y <package>', async () => {
    const runner = new MockRunner();

    await apt('ripgrep').install(runner);

    expect(runner.wasRun(['sudo', 'apt', 'install', '-y', 'ripgrep'])).toBe(true);
  });

  test('uninstall() runs sudo apt remove -y <package>', async () => {
    const runner = new MockRunner();

    await apt('ripgrep').uninstall(runner);

    expect(runner.wasRun(['sudo', 'apt', 'remove', '-y', 'ripgrep'])).toBe(true);
  });

  test('isInstalled() checks dpkg -s <package> without sudo', async () => {
    const runner = new MockRunner();
    runner.respondTo(['dpkg', '-s', 'ripgrep'], { exitCode: 0 });

    expect(await apt('ripgrep').isInstalled(runner)).toBe(true);
    expect(runner.commands.some((command) => command.includes('sudo'))).toBe(false);
  });

  test('isInstalled() is false when dpkg -s <package> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['dpkg', '-s', 'ripgrep']);

    expect(await apt('ripgrep').isInstalled(runner)).toBe(false);
  });

  test('install() rejects when sudo apt install -y <package> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['sudo', 'apt', 'install', '-y', 'ripgrep']);

    await expect(apt('ripgrep').install(runner)).rejects.toThrow();
  });

  test('uninstall() rejects when sudo apt remove -y <package> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['sudo', 'apt', 'remove', '-y', 'ripgrep']);

    await expect(apt('ripgrep').uninstall(runner)).rejects.toThrow();
  });
});
