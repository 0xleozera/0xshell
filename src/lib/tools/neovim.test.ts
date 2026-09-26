import { describe, expect, test } from 'bun:test';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createMockRunner } from '../mock-runner';
import neovim from './neovim';

describe('neovim tool', () => {
  test('darwin installs the aqua backend via mise, not a brew formula', async () => {
    const runner = createMockRunner();

    await neovim.darwin.install(runner);

    expect(runner.commands).toEqual([['mise', 'use', '--global', 'aqua:neovim/neovim@latest']]);
  });

  test('linux installs the aqua backend via mise, not the apt package', async () => {
    const runner = createMockRunner();

    await neovim.linux.install(runner);

    expect(runner.commands).toEqual([['mise', 'use', '--global', 'aqua:neovim/neovim@latest']]);
  });
});

describe('neovim configuration', () => {
  test('owns ~/.config/nvim as a whole, so a stale plugin spec cannot survive', () => {
    expect(neovim.configuration?.root).toBe(join(homedir(), '.config', 'nvim'));
    expect(neovim.configuration?.ownsRoot).toBe(true);
  });

  test('selects the night style of tokyonight', () => {
    const colorscheme = neovim.configuration?.files.find((file) => file.path === 'lua/plugins/colorscheme.lua');

    expect(colorscheme?.content).toContain('colorscheme = "tokyonight"');
    expect(colorscheme?.content).toContain('style = "night"');
  });
});
