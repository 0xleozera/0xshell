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
  //
  // Uninstall removes build-essential only: apt keeps gcc, make and
  // dpkg-dev around because `apt` itself suggests dpkg-dev, and naming them
  // would also take down whatever depends on them (dkms, for the NVIDIA
  // driver). The toolchain stays until the user removes it.
  linux: apt('build-essential'),
});
