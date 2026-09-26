import { defineTool } from '../tool';
import { apt } from '../helpers/apt';
import { brewFormula } from '../helpers/brew-formula';

export default defineTool({
  id: 'fd',
  stage: 3,
  tags: ['cli'],
  // LazyVim's file pickers use fd. Debian ships it as fd-find, with the
  // binary named `fdfind`, a name the pickers look for as well.
  darwin: brewFormula('fd'),
  linux: apt('fd-find'),
});
