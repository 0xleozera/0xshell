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
    uninstallCommand: ['rm', '-f', join(homedir(), '.local', 'bin', 'cursor-agent')],
    binName: 'cursor-agent',
  }),
});
