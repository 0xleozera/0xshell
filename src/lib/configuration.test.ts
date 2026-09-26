import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readBackup, type Backup } from './backup';
import { applyConfiguration, planConfiguration, type Configuration } from './configuration';
import { createBunRunner } from './runner';

// Runs against the real shell: the backup and write steps are sh scripts,
// and a mock would only prove the argv, not what lands on disk.
const runner = createBunRunner();
let home: string;
let backup: Backup;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), '0xshell-configuration-'));
  backup = { home, version: '20260926-143012' };
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

function savedCopy(path: string): string {
  return join(home, '.0xshell', 'backups', backup.version, 'files', path);
}

describe('applyConfiguration', () => {
  test('writes every missing file, creating its parent directories', async () => {
    const configuration: Configuration = {
      root: home,
      files: [
        { path: '.zshrc', content: 'export ZSH="$HOME/.oh-my-zsh"\n' },
        { path: '.config/eza/theme.yml', content: 'colourful: true\n' },
      ],
    };

    const result = await applyConfiguration(configuration, runner, backup);

    expect(result).toBe('applied');
    expect(readFileSync(join(home, '.zshrc'), 'utf8')).toBe('export ZSH="$HOME/.oh-my-zsh"\n');
    expect(readFileSync(join(home, '.config/eza/theme.yml'), 'utf8')).toBe('colourful: true\n');
  });

  test('records a file that did not exist as created, so a restore knows to remove it', async () => {
    const configuration: Configuration = { root: home, files: [{ path: '.antigenrc', content: 'antigen apply\n' }] };

    await applyConfiguration(configuration, runner, backup);

    expect(await readBackup(runner, backup)).toEqual([{ kind: 'created', path: join(home, '.antigenrc') }]);
  });

  test('writes content with shell and printf metacharacters byte for byte', async () => {
    const content = `PROMPT="%(?:%F{#9ece6a}%1{➜%} :%F{#f7768e})" $(whoami) \`id\` '\\n' \\ %s %%\n`;
    const configuration: Configuration = { root: home, files: [{ path: 'theme', content }] };

    await applyConfiguration(configuration, runner, backup);

    expect(readFileSync(join(home, 'theme'), 'utf8')).toBe(content);
  });

  test('touches nothing and creates no backup when every file already matches', async () => {
    writeFileSync(join(home, '.zshrc'), 'same\n');
    const configuration: Configuration = { root: home, files: [{ path: '.zshrc', content: 'same\n' }] };

    const result = await applyConfiguration(configuration, runner, backup);

    expect(result).toBe('unchanged');
    expect(readdirSync(home)).toEqual(['.zshrc']);
  });

  test('moves a file the user edited into ~/.0xshell before replacing it', async () => {
    writeFileSync(join(home, '.zshrc'), 'alias mine=1\n');
    const configuration: Configuration = { root: home, files: [{ path: '.zshrc', content: 'managed\n' }] };

    await applyConfiguration(configuration, runner, backup);

    expect(readFileSync(join(home, '.zshrc'), 'utf8')).toBe('managed\n');
    expect(readFileSync(savedCopy('.zshrc'), 'utf8')).toBe('alias mine=1\n');
    expect(await readBackup(runner, backup)).toEqual([{ kind: 'saved', path: join(home, '.zshrc') }]);
  });

  test('in a shared root, backs up only the stale files', async () => {
    writeFileSync(join(home, '.zshrc'), 'managed\n');
    writeFileSync(join(home, '.zprofile'), 'edited\n');
    writeFileSync(join(home, 'unrelated'), 'keep\n');
    const configuration: Configuration = {
      root: home,
      files: [
        { path: '.zshrc', content: 'managed\n' },
        { path: '.zprofile', content: 'profile\n' },
      ],
    };

    await applyConfiguration(configuration, runner, backup);

    expect(await readBackup(runner, backup)).toEqual([{ kind: 'saved', path: join(home, '.zprofile') }]);
    expect(readFileSync(join(home, 'unrelated'), 'utf8')).toBe('keep\n');
  });

  test('when it owns the root, backs up the whole directory so leftover files stop applying', async () => {
    const nvim = join(home, '.config', 'nvim');
    mkdirSync(join(nvim, 'lua', 'plugins'), { recursive: true });
    writeFileSync(join(nvim, 'init.lua'), 'require("config.lazy")\n');
    writeFileSync(join(nvim, 'lua', 'plugins', 'colorschema.lua'), 'return { "onedark" }\n');
    const configuration: Configuration = {
      root: nvim,
      ownsRoot: true,
      files: [
        { path: 'init.lua', content: 'require("config.lazy")\n' },
        { path: 'lua/plugins/colorscheme.lua', content: 'return { "tokyonight" }\n' },
      ],
    };

    await applyConfiguration(configuration, runner, backup);

    expect(existsSync(join(nvim, 'lua', 'plugins', 'colorschema.lua'))).toBe(false);
    expect(readFileSync(join(nvim, 'lua', 'plugins', 'colorscheme.lua'), 'utf8')).toBe('return { "tokyonight" }\n');
    expect(readFileSync(savedCopy('.config/nvim/lua/plugins/colorschema.lua'), 'utf8')).toBe('return { "onedark" }\n');
    expect(await readBackup(runner, backup)).toEqual([{ kind: 'saved', path: nvim }]);
  });

  test('throws when a file cannot be written', async () => {
    writeFileSync(join(home, 'config'), 'a file, not a directory\n');
    const configuration: Configuration = { root: join(home, 'config', 'eza'), files: [{ path: 'theme.yml', content: 'x' }] };

    await expect(applyConfiguration(configuration, runner, backup)).rejects.toThrow('command failed');
  });
});

describe('planConfiguration', () => {
  test('lists the stale files without writing or backing up anything', async () => {
    writeFileSync(join(home, '.zshrc'), 'edited\n');
    const configuration: Configuration = {
      root: home,
      files: [
        { path: '.zshrc', content: 'managed\n' },
        { path: '.zprofile', content: 'profile\n' },
      ],
    };

    const plan = await planConfiguration(configuration, runner);

    expect(plan.writes.map((file) => file.path)).toEqual([join(home, '.zshrc'), join(home, '.zprofile')]);
    expect(readdirSync(home)).toEqual(['.zshrc']);
    expect(readFileSync(join(home, '.zshrc'), 'utf8')).toBe('edited\n');
  });

  test('plans nothing when the machine already matches', async () => {
    writeFileSync(join(home, '.zshrc'), 'managed\n');
    const configuration: Configuration = { root: home, files: [{ path: '.zshrc', content: 'managed\n' }] };

    expect(await planConfiguration(configuration, runner)).toEqual({ backups: [], writes: [] });
  });
});
