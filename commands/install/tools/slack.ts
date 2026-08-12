import { aptRepo } from '../../../helpers/apt-repo';
import { brewCask } from '../../../helpers/brew-cask';
import { defineTool } from '../../../tool/define-tool';

export default defineTool({
  id: 'slack',
  darwin: brewCask('slack'),
  linux: aptRepo({
    repo: 'deb https://packagecloud.io/slacktechnologies/slack/debian/ jessie main',
    packageName: 'slack-desktop',
  }),
});
