import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../runner/mock-runner';
import { mise } from './mise';

describe('mise', () => {
  test('install() runs mise install <tool>', async () => {
    const runner = new MockRunner();

    await mise('bun').install(runner);

    expect(runner.wasRun(['mise', 'install', 'bun'])).toBe(true);
  });

  test('install() accepts a backend-qualified tool id', async () => {
    const runner = new MockRunner();

    await mise('aqua:neovim/neovim').install(runner);

    expect(runner.wasRun(['mise', 'install', 'aqua:neovim/neovim'])).toBe(true);
  });

  test('uninstall() runs mise uninstall <tool>', async () => {
    const runner = new MockRunner();

    await mise('bun').uninstall(runner);

    expect(runner.wasRun(['mise', 'uninstall', 'bun'])).toBe(true);
  });

  test('isInstalled() is true when mise ls <tool> has output', async () => {
    const runner = new MockRunner();
    runner.respondTo(['mise', 'ls', 'bun'], { exitCode: 0, stdout: 'bun  1.1.0\n' });

    expect(await mise('bun').isInstalled(runner)).toBe(true);
  });

  test('isInstalled() is false when mise ls <tool> succeeds with no versions installed', async () => {
    const runner = new MockRunner();
    runner.respondTo(['mise', 'ls', 'bun'], { exitCode: 0, stdout: '' });

    expect(await mise('bun').isInstalled(runner)).toBe(false);
  });

  test('isInstalled() is false when mise ls <tool> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['mise', 'ls', 'bun']);

    expect(await mise('bun').isInstalled(runner)).toBe(false);
  });
});
