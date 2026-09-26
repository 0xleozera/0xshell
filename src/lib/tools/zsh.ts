import { homedir, userInfo } from 'node:os';
import zprofile from '../../dotfiles/zsh/zprofile.zsh' with { type: 'text' };
import zshrc from '../../dotfiles/zsh/zshrc.zsh' with { type: 'text' };
import type { Runner } from '../runner';
import { defineTool } from '../tool';
import { apt } from '../helpers/apt';
import { brewFormula } from '../helpers/brew-formula';
import { custom } from '../helpers/custom';
import { runChecked } from '../helpers/run-checked';

const user = userInfo().username;
const aptZsh = apt('zsh');

export default defineTool({
  id: 'zsh',
  stage: 3,
  tags: ['cli', 'shell'],
  // macOS already logs in with /bin/zsh; the formula keeps a copy that brew
  // updates and that `uninstall` can actually remove.
  darwin: brewFormula('zsh'),
  // On Linux the Tool is only "installed" once zsh is the login shell: a zsh
  // binary sitting next to a bash login shell is never used.
  linux: custom({
    ...aptZsh,
    async install(runner: Runner): Promise<void> {
      await aptZsh.install(runner);
      await runChecked(runner, ['sudo', 'chsh', '-s', '/usr/bin/zsh', user]);
    },
    async uninstall(runner: Runner): Promise<void> {
      // Back to bash first: removing the login shell locks the user out of
      // every new terminal.
      await runChecked(runner, ['sudo', 'chsh', '-s', '/bin/bash', user]);
      await aptZsh.uninstall(runner);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const loginShell = await runner.run(['sh', '-c', 'getent passwd "$1" | cut -d: -f7', 'sh', user]);
      return loginShell.stdout.trim() === '/usr/bin/zsh' && (await aptZsh.isInstalled(runner));
    },
  }),
  configuration: {
    root: homedir(),
    files: [
      { path: '.zshrc', content: zshrc },
      { path: '.zprofile', content: zprofile },
    ],
  },
});
