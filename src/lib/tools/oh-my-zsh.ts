import { homedir } from 'node:os';
import { join } from 'node:path';
import theme from '../../dotfiles/oh-my-zsh/tokyonight.zsh-theme' with { type: 'text' };
import type { Runner } from '../runner';
import { defineTool } from '../tool';
import { custom } from '../helpers/custom';
import { runChecked } from '../helpers/run-checked';

const installerUrl = 'https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh';
const ohMyZshDir = join(homedir(), '.oh-my-zsh');

const recipe = custom({
  async install(runner: Runner): Promise<void> {
    // --unattended skips chsh and the interactive shell it would open at the
    // end; --keep-zshrc leaves ~/.zshrc to the zsh Tool.
    await runChecked(runner, ['sh', '-c', `sh -c "$(curl -fsSL ${installerUrl})" "" --unattended --keep-zshrc`]);
  },
  async uninstall(runner: Runner): Promise<void> {
    // Not the bundled tools/uninstall.sh: it also restores an old ~/.zshrc,
    // and uninstall never touches configuration (ADR-0001).
    await runChecked(runner, ['rm', '-rf', ohMyZshDir]);
  },
  async isInstalled(runner: Runner): Promise<boolean> {
    const result = await runner.run(['test', '-f', join(ohMyZshDir, 'oh-my-zsh.sh')]);
    return result.exitCode === 0;
  },
});

export default defineTool({
  id: 'oh-my-zsh',
  stage: 3,
  tags: ['cli', 'shell'],
  darwin: recipe,
  linux: recipe,
  configuration: {
    root: join(ohMyZshDir, 'custom', 'themes'),
    files: [{ path: 'tokyonight.zsh-theme', content: theme }],
  },
});
