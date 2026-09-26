import { homedir } from 'node:os';
import { join } from 'node:path';
import init from '../../dotfiles/neovim/init.lua' with { type: 'text' };
import autocmds from '../../dotfiles/neovim/lua/config/autocmds.lua' with { type: 'text' };
import keymaps from '../../dotfiles/neovim/lua/config/keymaps.lua' with { type: 'text' };
import lazy from '../../dotfiles/neovim/lua/config/lazy.lua' with { type: 'text' };
import options from '../../dotfiles/neovim/lua/config/options.lua' with { type: 'text' };
import colorscheme from '../../dotfiles/neovim/lua/plugins/colorscheme.lua' with { type: 'text' };
import treesitter from '../../dotfiles/neovim/lua/plugins/treesitter.lua' with { type: 'text' };
import { defineTool } from '../tool';
import { mise } from '../helpers/mise';

// aqua:neovim/neovim, not the apt/brew package — the mise backend is the only
// way to get a current neovim on Linux, where the apt package trails years
// behind.
const recipe = mise('aqua:neovim/neovim');

export default defineTool({
  id: 'neovim',
  stage: 2,
  tags: ['cli'],
  darwin: recipe,
  linux: recipe,
  // LazyVim loads every file under lua/plugins, so a stale plugin spec left
  // next to these would still apply. The directory is replaced as a whole.
  configuration: {
    root: join(homedir(), '.config', 'nvim'),
    ownsRoot: true,
    files: [
      { path: 'init.lua', content: init },
      { path: 'lua/config/lazy.lua', content: lazy },
      { path: 'lua/config/options.lua', content: options },
      { path: 'lua/config/keymaps.lua', content: keymaps },
      { path: 'lua/config/autocmds.lua', content: autocmds },
      { path: 'lua/plugins/colorscheme.lua', content: colorscheme },
      { path: 'lua/plugins/treesitter.lua', content: treesitter },
    ],
  },
});
