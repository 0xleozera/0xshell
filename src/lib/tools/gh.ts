import { defineTool } from '../tool';
import { aptRepo } from '../helpers/apt-repo';
import { brewFormula } from '../helpers/brew-formula';

export default defineTool({
  id: 'gh',
  stage: 3,
  tags: ['cli'],
  darwin: brewFormula('gh'),
  // GitHub's own repository: the `gh` in the Ubuntu archive trails releases
  // by years (2.46 on 26.04). Its key is published binary, which
  // `gpg --dearmor` passes through unchanged.
  linux: aptRepo({
    repoName: 'github-cli',
    keyUrl: 'https://cli.github.com/packages/githubcli-archive-keyring.gpg',
    repoUrl: 'https://cli.github.com/packages',
    distribution: 'stable',
    components: 'main',
    packageName: 'gh',
  }),
});
