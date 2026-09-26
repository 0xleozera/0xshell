import { aptRepo } from '../helpers/apt-repo';
import { brewCask } from '../helpers/brew-cask';
import { defineTool } from '../tool';

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
    // A daily cron job (a conffile, so `apt remove` keeps it) rewrites
    // slack.list in its own format and installs its keys in trusted.gpg.d —
    // left alone, it brings the repository back every day after an uninstall.
    leftovers: [
      '/etc/cron.daily/slack',
      '/etc/default/slack',
      '/etc/apt/trusted.gpg.d/slack-desktop.gpg',
      '/etc/apt/trusted.gpg.d/packagecloud.gpg',
    ],
  }),
});
