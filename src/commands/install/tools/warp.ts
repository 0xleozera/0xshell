import { defineTool } from '../../../tool/define-tool';
import { brewCask } from '../../../helpers/brew-cask';
import { aptRepo } from '../../../helpers/apt-repo';

export default defineTool({
  id: 'warp',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('warp'),
  linux: aptRepo({
    repoName: 'warp',
    keyUrl: 'https://releases.warp.dev/linux/keys/warp.asc',
    repoUrl: 'https://releases.warp.dev/linux/deb',
    distribution: 'stable',
    components: 'main',
    packageName: 'warp-terminal',
  }),
});
