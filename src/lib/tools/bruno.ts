import { defineTool } from '../tool';
import { aptRepo } from '../helpers/apt-repo';
import { brewCask } from '../helpers/brew-cask';

export default defineTool({
  id: 'bruno',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('bruno'),
  // Bruno's own repository; its signing key is published on the Ubuntu
  // keyserver, not next to the repository.
  linux: aptRepo({
    repoName: 'bruno',
    keyUrl: 'https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x9FA6017ECABE0266',
    repoUrl: 'http://debian.usebruno.com/',
    distribution: 'bruno',
    components: 'stable',
    packageName: 'bruno',
  }),
});
