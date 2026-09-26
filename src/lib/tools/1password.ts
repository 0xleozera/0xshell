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
    // The postinst comments our source out and writes its own, plus the
    // debsig policy that verifies the package; its postrm removes none of it.
    leftovers: [
      '/etc/apt/sources.list.d/1password.sources',
      '/usr/share/keyrings/1password-archive-keyring.gpg',
      '/usr/share/debsig/keyrings/AC2D62742012EA22',
      '/etc/debsig/policies/AC2D62742012EA22',
    ],
  }),
});
