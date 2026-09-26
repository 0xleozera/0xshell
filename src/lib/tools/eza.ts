import { homedir } from 'node:os';
import { join } from 'node:path';
import theme from '../../dotfiles/eza/theme.yml' with { type: 'text' };
import { defineTool } from '../tool';
import { aptRepo } from '../helpers/apt-repo';
import { brewFormula } from '../helpers/brew-formula';

export default defineTool({
  id: 'eza',
  stage: 3,
  tags: ['cli', 'shell'],
  darwin: brewFormula('eza'),
  // Not in the Ubuntu archive before 24.04; the eza maintainers publish this
  // repository for every Debian-based release.
  linux: aptRepo({
    repoName: 'gierens',
    keyUrl: 'https://raw.githubusercontent.com/eza-community/eza/main/deb.asc',
    repoUrl: 'http://deb.gierens.de',
    distribution: 'stable',
    components: 'main',
    packageName: 'eza',
  }),
  configuration: {
    root: join(homedir(), '.config', 'eza'),
    files: [{ path: 'theme.yml', content: theme }],
  },
});
