import { defineTool } from '../../../tool/define-tool';
import { brewCask } from '../../../helpers/brew-cask';
import { aptRepo } from '../../../helpers/apt-repo';

export default defineTool({
  id: 'spotify',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('spotify'),
  linux: aptRepo({
    repoName: 'spotify',
    keyUrl: 'https://download.spotify.com/debian/pubkey_C85668DF69375001.gpg',
    repoUrl: 'http://repository.spotify.com',
    distribution: 'stable',
    components: 'non-free',
    packageName: 'spotify-client',
  }),
});
