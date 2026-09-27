import { defineTool } from '../tool';
import { apt } from '../helpers/apt';
import { brewFormula } from '../helpers/brew-formula';

export default defineTool({
  id: 'ripgrep',
  stage: 3,
  tags: ['cli'],
  // LazyVim's grep pickers shell out to `rg`.
  darwin: brewFormula('ripgrep'),
  linux: apt('ripgrep'),
});
