import { describe, expect, test } from 'bun:test';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createMockRunner } from '../mock-runner';
import ohMyZsh from './oh-my-zsh';

describe('oh-my-zsh tool', () => {
  test('runs the official installer unattended, leaving ~/.zshrc alone', async () => {
    const runner = createMockRunner();

    await ohMyZsh.darwin.install(runner);

    expect(runner.commands).toEqual([
      [
        'sh',
        '-c',
        'sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended --keep-zshrc',
      ],
    ]);
  });

  test('uninstall removes the install directory instead of running the bundled uninstaller', async () => {
    const runner = createMockRunner();

    await ohMyZsh.linux.uninstall(runner);

    expect(runner.commands).toEqual([['rm', '-rf', join(homedir(), '.oh-my-zsh')]]);
  });

  test('writes the gruvbox theme into the custom themes directory', () => {
    expect(ohMyZsh.configuration?.root).toBe(join(homedir(), '.oh-my-zsh', 'custom', 'themes'));
    expect(ohMyZsh.configuration?.files.map((file) => file.path)).toEqual(['gruvbox.zsh-theme']);
  });
});
