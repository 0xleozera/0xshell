import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineTool } from '../tool';
import { brewCask } from '../helpers/brew-cask';
import { aptRepo } from '../helpers/apt-repo';

export default defineTool({
  id: 'warp',
  stage: 3,
  tags: ['apps'],
  darwin: brewCask('warp'),
  // warpdotdev: the name warp-terminal's postinst checks for. Under any other
  // name it writes warpdotdev.sources next to ours, with another keyring, and
  // the two sources for one URL make every later `apt update` fail.
  linux: aptRepo({
    repoName: 'warpdotdev',
    keyUrl: 'https://releases.warp.dev/linux/keys/warp.asc',
    repoUrl: 'https://releases.warp.dev/linux/deb',
    distribution: 'stable',
    components: 'main',
    packageName: 'warp-terminal',
    // The key the postinst installs for itself, whatever the source is called.
    leftovers: ['/etc/apt/trusted.gpg.d/warpdotdev.gpg', '/etc/apt/sources.list.d/warpdotdev.sources'],
  }),
  // Warp's built-in Gruvbox Dark. settings.toml holds every other Warp
  // preference too, so only this key is set.
  configuration: {
    root: process.platform === 'darwin' ? join(homedir(), '.warp') : join(homedir(), '.config', 'warp-terminal'),
    files: [],
    settings: [{ path: 'settings.toml', format: 'toml', section: 'appearance.themes', key: 'theme', value: '"gruvbox_dark"' }],
  },
});
