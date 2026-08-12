import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../runner/mock-runner';
import { appImage } from './app-image';

const options = { url: 'https://example.com/orca.AppImage', binName: 'orca' };
const installDir = join(homedir(), '.local', 'bin');
const binPath = join(installDir, options.binName);

describe('appImage', () => {
  test('install() downloads into ~/.local/bin and makes it executable', async () => {
    const runner = new MockRunner();

    await appImage(options).install(runner);

    expect(runner.commands).toEqual([
      ['mkdir', '-p', installDir],
      ['curl', '-fsSL', options.url, '-o', binPath],
      ['chmod', '+x', binPath],
    ]);
  });

  test('uninstall() removes the binary', async () => {
    const runner = new MockRunner();

    await appImage(options).uninstall(runner);

    expect(runner.wasRun(['rm', '-f', binPath])).toBe(true);
  });

  test('isInstalled() reflects command -v <bin>', async () => {
    const runner = new MockRunner();
    runner.respondTo(['sh', '-c', `command -v ${options.binName}`], { exitCode: 0 });

    expect(await appImage(options).isInstalled(runner)).toBe(true);
  });

  test('isInstalled() is false when command -v <bin> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['sh', '-c', `command -v ${options.binName}`]);

    expect(await appImage(options).isInstalled(runner)).toBe(false);
  });
});
