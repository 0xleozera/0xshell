import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineTool } from '../tool';
import { brewCask } from '../helpers/brew-cask';
import { script } from '../helpers/script';

export default defineTool({
  id: 'cursor-cli',
  stage: 3,
  tags: ['cli'],
  darwin: brewCask('cursor-cli'),
  linux: script({
    url: 'https://cursor.com/install',
    // The installer links the same binary as `agent` and `cursor-agent`, and
    // keeps every version it downloaded under ~/.local/share/cursor-agent.
    uninstallCommand: [
      'rm',
      '-rf',
      join(homedir(), '.local', 'bin', 'agent'),
      join(homedir(), '.local', 'bin', 'cursor-agent'),
      join(homedir(), '.local', 'share', 'cursor-agent'),
    ],
    binName: 'cursor-agent',
  }),
});
