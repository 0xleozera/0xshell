import { defineTool } from '../../../tool/define-tool';
import { brewCask } from '../../../helpers/brew-cask';
import { aptRepo } from '../../../helpers/apt-repo';

export default defineTool({
  id: 'dbeaver',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('dbeaver-community'),
  // DBeaver's apt repo is flat (`deb <url> /`, no distribution/components),
  // hence the empty components here.
  linux: aptRepo({
    repoName: 'dbeaver',
    keyUrl: 'https://dbeaver.io/debs/dbeaver.gpg.key',
    repoUrl: 'https://dbeaver.io/debs/dbeaver-ce',
    distribution: '/',
    components: '',
    packageName: 'dbeaver-ce',
  }),
});
