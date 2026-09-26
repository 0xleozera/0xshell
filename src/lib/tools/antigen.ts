import { homedir } from 'node:os';
import { join } from 'node:path';
import antigenrc from '../../dotfiles/antigen/antigenrc.zsh' with { type: 'text' };
import type { Runner } from '../runner';
import { defineTool } from '../tool';
import { custom } from '../helpers/custom';
import { runChecked } from '../helpers/run-checked';

// Pinned to the last release: antigen is a single file, and its master
// branch is not what the release notes describe.
const antigenUrl = 'https://raw.githubusercontent.com/zsh-users/antigen/v2.2.3/bin/antigen.zsh';
const antigenPath = join(homedir(), 'antigen.zsh');

const recipe = custom({
  async install(runner: Runner): Promise<void> {
    await runChecked(runner, ['curl', '-fsSL', antigenUrl, '-o', antigenPath]);
  },
  async uninstall(runner: Runner): Promise<void> {
    await runChecked(runner, ['rm', '-f', antigenPath]);
  },
  async isInstalled(runner: Runner): Promise<boolean> {
    const result = await runner.run(['test', '-f', antigenPath]);
    return result.exitCode === 0;
  },
});

export default defineTool({
  id: 'antigen',
  stage: 3,
  tags: ['cli', 'shell'],
  darwin: recipe,
  linux: recipe,
  configuration: {
    root: homedir(),
    files: [{ path: '.antigenrc', content: antigenrc }],
  },
});
