import type { Runner } from '../runner';
import { defineTool } from '../tool';
import { custom } from '../helpers/custom';
import { runChecked } from '../helpers/run-checked';

const installerUrl = 'https://hermes-agent.nousresearch.com/install.sh';

// The installer picks the rc file to put ~/.local/bin on the PATH in from
// $SHELL, which is the shell 0xshell was started from — bash on a new
// machine, even after the zsh Tool made zsh the login shell. It gets the
// login shell instead, whose rc files (the zsh Configuration) already have
// that line, so it adds nothing.
const loginShell =
  '$( (getent passwd "$(id -un)" 2>/dev/null || dscl . -read "/Users/$(id -un)" UserShell 2>/dev/null) | sed -E "s/.*[: ]//")';

// What the installer appends when an rc file had no ~/.local/bin line.
// `hermes uninstall` removes the comment but keeps the export (it has no
// "hermes" in it), so the pair goes first, with the blank line before it.
const rcFiles = ['.bashrc', '.profile', '.bash_profile', '.zshrc', '.zprofile'];
const pathBlock = String.raw`s/\n?# Hermes Agent command\nexport PATH="\$HOME\/.local\/bin:\$PATH"\n//g`;

const recipe = custom({
  async install(runner: Runner): Promise<void> {
    // --non-interactive: `hermes setup` and the gateway service ask
    // questions on the terminal; they are the user's to run afterwards.
    // npm_config_cache: the Node dependencies it builds with would otherwise
    // leave an npm cache in ~/.npm that uninstall has no claim to.
    await runChecked(runner, [
      'bash',
      '-c',
      `set -o pipefail; login=${loginShell}; curl -fsSL ${installerUrl} | ` +
        `SHELL="\${login:-$SHELL}" npm_config_cache="$HOME/.hermes/cache/npm" bash -s -- --non-interactive`,
    ]);
  },
  async uninstall(runner: Runner): Promise<void> {
    await runChecked(runner, [
      'sh',
      '-c',
      `for rc in ${rcFiles.map((file) => `"$HOME/${file}"`).join(' ')}; do [ -f "$rc" ] && perl -0pi -e '${pathBlock}' "$rc"; done; true`,
    ]);
    // Removes the code, the launcher and the tools it downloaded; keeps
    // ~/.hermes (config, API keys, memories), as every uninstall does (ADR-0001).
    await runChecked(runner, ['hermes', 'uninstall', '--yes']);
  },
  async isInstalled(runner: Runner): Promise<boolean> {
    const result = await runner.run(['sh', '-c', 'command -v hermes']);
    return result.exitCode === 0;
  },
});

export default defineTool({
  id: 'hermes-agent',
  stage: 3,
  tags: ['cli'],
  // Nous Research's own installer, the same on both Platforms.
  darwin: recipe,
  linux: recipe,
});
