import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import antigen from '../lib/tools/antigen';
import eza from '../lib/tools/eza';
import ohMyZsh from '../lib/tools/oh-my-zsh';
import zsh from '../lib/tools/zsh';

function fileOf(tool: typeof zsh, path: string): string {
  const file = tool.configuration?.files.find((entry) => entry.path === path);
  if (!file) throw new Error(`${tool.id} does not write ${path}`);
  return file.content;
}

const zshrc = fileOf(zsh, '.zshrc');

// ~/.zshrc is written by the zsh Tool but points at files other Tools write;
// a rename on either side would leave the shell silently unthemed.
describe('shell dotfiles', () => {
  test('ZSH_THEME names the theme the oh-my-zsh Tool writes', () => {
    const theme = zshrc.match(/^ZSH_THEME="(.+)"$/m)?.[1];

    expect(ohMyZsh.configuration?.files.map((file) => file.path)).toContain(`${theme}.zsh-theme`);
  });

  test('antigen is initialised from the file the antigen Tool writes', () => {
    expect(zshrc).toContain('antigen init ~/.antigenrc');
    expect(join(antigen.configuration!.root, '.antigenrc')).toBe(join(homedir(), '.antigenrc'));
  });

  test('EZA_CONFIG_DIR is the directory the eza Tool writes its theme into', () => {
    const configDir = zshrc.match(/^export EZA_CONFIG_DIR=(.+)$/m)?.[1];

    expect(configDir?.replace('~', homedir())).toBe(eza.configuration?.root);
  });
});

describe.skipIf(!Bun.which('zsh'))('~/.zshrc on a machine where nothing else is installed yet', () => {
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), '0xshell-zshrc-'));
    writeFileSync(join(home, '.zshrc'), zshrc);
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  test('still opens a working shell', () => {
    const shell = Bun.spawnSync(['zsh', '-i', '-c', 'echo ready'], {
      env: { ...process.env, HOME: home, ZDOTDIR: home },
    });

    expect(shell.exitCode).toBe(0);
    expect(shell.stdout.toString().trim()).toBe('ready');
    expect(shell.stderr.toString()).not.toContain('no such file');
    expect(shell.stderr.toString()).not.toContain('command not found');
  });
});
