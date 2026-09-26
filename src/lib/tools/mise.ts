import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineTool } from '../tool';
import { script } from '../helpers/script';

const installer = script({
  url: 'https://mise.run',
  // The binary, the installed runtimes, and the global config, cache and state
  // that `mise use --global` and every install leave behind.
  uninstallCommand: [
    'rm',
    '-rf',
    join(homedir(), '.local', 'bin', 'mise'),
    join(homedir(), '.local', 'share', 'mise'),
    join(homedir(), '.local', 'state', 'mise'),
    join(homedir(), '.config', 'mise'),
    join(homedir(), '.cache', 'mise'),
  ],
  binName: 'mise',
});

export default defineTool({
  id: 'mise',
  stage: 1,
  tags: ['cli'],
  darwin: installer,
  linux: installer,
});
