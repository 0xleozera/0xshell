import { defineTool } from '../tool';
import { apt } from '../helpers/apt';
import { brewFormula } from '../helpers/brew-formula';

export default defineTool({
  id: 'git',
  stage: 3,
  tags: ['cli'],
  // macOS already ships a git through Apple's Command Line Tools, behind the
  // upstream release and tied to the Xcode cycle. The Homebrew formula comes
  // first in PATH and is the one that stays current.
  darwin: brewFormula('git'),
  linux: apt('git'),
});
