import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import { mise } from './mise';

const lsGlobal = (tool: string) => ['mise', 'ls', '--global', '--installed', tool];

describe('mise', () => {
  test('install() pins the tool at latest in the global config, so it lands on the PATH', async () => {
    const runner = createMockRunner();

    await mise('bun').install(runner);

    expect(runner.commands).toEqual([['mise', 'use', '--global', 'bun@latest']]);
  });

  test('install() accepts a backend-qualified tool id', async () => {
    const runner = createMockRunner();

    await mise('aqua:neovim/neovim').install(runner);

    expect(runner.wasRun(['mise', 'use', '--global', 'aqua:neovim/neovim@latest'])).toBe(true);
  });

  test('uninstall() drops the tool from the global config, then removes every installed version', async () => {
    const runner = createMockRunner();

    await mise('bun').uninstall(runner);

    expect(runner.commands).toEqual([
      ['mise', 'use', '--global', '--remove', 'bun'],
      ['mise', 'uninstall', '--all', 'bun'],
    ]);
  });

  test('isInstalled() is true when the global config asks for an installed version', async () => {
    const runner = createMockRunner();
    runner.respondTo(lsGlobal('bun'), { exitCode: 0, stdout: 'bun  1.1.0  ~/.config/mise/config.toml  latest\n' });

    expect(await mise('bun').isInstalled(runner)).toBe(true);
  });

  test('isInstalled() is false when a version is on disk but no config asks for it', async () => {
    const runner = createMockRunner();
    runner.respondTo(lsGlobal('bun'), { exitCode: 0, stdout: '' });

    expect(await mise('bun').isInstalled(runner)).toBe(false);
  });

  test('isInstalled() is false when mise ls fails', async () => {
    const runner = createMockRunner();
    runner.failOn(lsGlobal('bun'));

    expect(await mise('bun').isInstalled(runner)).toBe(false);
  });

  test('install() rejects when mise use fails', async () => {
    const runner = createMockRunner();
    runner.failOn(['mise', 'use', '--global', 'bun@latest']);

    await expect(mise('bun').install(runner)).rejects.toThrow();
  });

  test('uninstall() rejects when mise uninstall fails', async () => {
    const runner = createMockRunner();
    runner.failOn(['mise', 'uninstall', '--all', 'bun']);

    await expect(mise('bun').uninstall(runner)).rejects.toThrow();
  });
});
