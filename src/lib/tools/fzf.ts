import { defineTool } from '../tool';
import { apt } from '../helpers/apt';
import { brewFormula } from '../helpers/brew-formula';

export default defineTool({
  id: 'fzf',
  stage: 3,
  tags: ['cli', 'shell'],
  darwin: brewFormula('fzf'),
  linux: apt('fzf'),
});
