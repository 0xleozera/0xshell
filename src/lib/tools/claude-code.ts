import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineTool } from '../tool';
import { brewCask } from '../helpers/brew-cask';
import { script } from '../helpers/script';

export default defineTool({
  id: 'claude-code',
  stage: 3,
  tags: ['cli'],
  darwin: brewCask('claude-code'),
  linux: script({
    url: 'https://claude.ai/install.sh',
    // The native installer's own uninstall steps: the launcher and the
    // versions it points at. ~/.claude (settings, history) is left alone.
    uninstallCommand: ['rm', '-rf', join(homedir(), '.local', 'bin', 'claude'), join(homedir(), '.local', 'share', 'claude')],
    binName: 'claude',
  }),
  // Claude Code has no Gruvbox; its ANSI theme draws with the terminal's own
  // palette, which is Warp's Gruvbox Dark. Only this key of settings.json,
  // which also holds permissions, plugins and model settings.
  configuration: {
    root: join(homedir(), '.claude'),
    files: [],
    settings: [{ path: 'settings.json', format: 'json', section: '', key: 'theme', value: '"dark-ansi"' }],
  },
});
