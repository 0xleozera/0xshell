import { defineTool } from '../tool';
import { brewCask } from '../helpers/brew-cask';
import { aptRepo } from '../helpers/apt-repo';

export default defineTool({
  id: '1password',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('1password'),
  linux: aptRepo({
    repoName: '1password',
    keyUrl: 'https://downloads.1password.com/linux/keys/1password.asc',
    repoUrl: 'https://downloads.1password.com/linux/debian/amd64',
    distribution: 'stable',
    components: 'main',
    packageName: '1password',
  }),
});
