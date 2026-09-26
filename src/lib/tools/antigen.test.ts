import { describe, expect, test } from 'bun:test';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createMockRunner } from '../mock-runner';
import antigen from './antigen';

describe('antigen tool', () => {
  test('downloads the pinned release into ~/antigen.zsh', async () => {
    const runner = createMockRunner();

    await antigen.darwin.install(runner);

    expect(runner.commands).toEqual([
      [
        'curl',
        '-fsSL',
        'https://raw.githubusercontent.com/zsh-users/antigen/v2.2.3/bin/antigen.zsh',
        '-o',
        join(homedir(), 'antigen.zsh'),
      ],
    ]);
  });

  test('uninstall removes antigen and the plugin bundles it cloned', async () => {
    const runner = createMockRunner();

    await antigen.linux.uninstall(runner);

    expect(runner.commands).toEqual([['rm', '-rf', join(homedir(), 'antigen.zsh'), join(homedir(), '.antigen')]]);
  });

  test('is installed when ~/antigen.zsh exists', async () => {
    const runner = createMockRunner();
    runner.failOn(['test', '-f', join(homedir(), 'antigen.zsh')]);

    expect(await antigen.linux.isInstalled(runner)).toBe(false);
  });

  test('writes ~/.antigenrc', () => {
    expect(antigen.configuration?.root).toBe(homedir());
    expect(antigen.configuration?.files.map((file) => file.path)).toEqual(['.antigenrc']);
  });
});
