import { aptRepo } from '../../../helpers/apt-repo';
import { brewCask } from '../../../helpers/brew-cask';
import { defineTool } from '../../../tool/define-tool';

export default defineTool({
  id: 'slack',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('slack'),
  linux: aptRepo({
    repoName: 'slack',
    keyUrl: 'https://packagecloud.io/slacktechnologies/slack/gpgkey',
    repoUrl: 'https://packagecloud.io/slacktechnologies/slack/debian/',
    distribution: 'jessie',
    components: 'main',
    packageName: 'slack-desktop',
  }),
});
