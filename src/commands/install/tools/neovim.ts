import { defineTool } from '../../../tool/define-tool';
import { mise } from '../../../helpers/mise';

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
});
