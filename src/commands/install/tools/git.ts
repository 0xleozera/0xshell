import { defineTool } from '../../../tool/define-tool';
import { apt } from '../../../helpers/apt';
import { brewFormula } from '../../../helpers/brew-formula';

export default defineTool({
  id: 'git',
  stage: 3,
  tags: ['cli'],
  // macOS já traz um git pelas Command Line Tools da Apple, atrás da versão
  // upstream e amarrado ao ciclo do Xcode. A formula do Homebrew entra antes
  // dele no PATH e é a que fica atualizada.
  darwin: brewFormula('git'),
  linux: apt('git'),
});
