import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineTool } from '../../../tool/define-tool';
import { script } from '../../../helpers/script';

const installer = script({
  url: 'https://mise.run',
  uninstallCommand: ['rm', '-rf', join(homedir(), '.local', 'bin', 'mise'), join(homedir(), '.local', 'share', 'mise')],
  binName: 'mise',
});

export default defineTool({
  id: 'mise',
  stage: 1,
  tags: ['cli'],
  darwin: installer,
  linux: installer,
});
