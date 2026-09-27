import { defineTool } from '../tool';
import { brewCask } from '../helpers/brew-cask';
import { aptRepo } from '../helpers/apt-repo';

export default defineTool({
  id: 'spotify',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('spotify'),
  linux: aptRepo({
    repoName: 'spotify',
    keyUrl: 'https://download.spotify.com/debian/pubkey_5384CE82BA52C83A.gpg',
    repoUrl: 'http://repository.spotify.com',
    distribution: 'stable',
    components: 'non-free',
    packageName: 'spotify-client',
    // The postinst drops its signing key in trusted.gpg.d under a dated name
    // (spotify-2025-11-21-5384CE82BA52C83A.gpg) that changes with each key.
    leftovers: ['/etc/apt/trusted.gpg.d/spotify-*.gpg'],
  }),
});
