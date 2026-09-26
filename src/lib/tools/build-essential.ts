import { defineTool, unsupported } from '../tool';
import { apt } from '../helpers/apt';

export default defineTool({
  id: 'build-essential',
  stage: 3,
  tags: ['cli'],
  // The Command Line Tools Homebrew installs first already bring clang.
  darwin: unsupported('the Command Line Tools Homebrew installs already bring a C compiler'),
  // A C compiler: nvim-treesitter builds every parser from source, and
  // without one the neovim Configuration reports unmet requirements on every
  // file it opens.
  linux: apt('build-essential'),
});
