import type { Command, Runner } from '../runner';
import type { Recipe } from '../recipe';
import { runChecked } from './run-checked';

export type ScriptOptions = {
  readonly url: string;
  /** Command that undoes the install — remote scripts have no common uninstall path, so the Tool supplies it. */
  readonly uninstallCommand: Command;
  readonly binName: string;
};

/**
 * Helper for Tools installed by piping a remote script into a shell
 * (ADR-0002) — `curl | bash`, the classic third-party installer. The pipe
 * needs a shell, so `install()` is the one place in this Helper that reaches
 * for `sh -c`.
 *
 * The script runs under `bash`, not `sh`: installers are written for bash
 * (`[[ ]]`, `echo -e`), and on Debian/Ubuntu `sh` is dash, which stops or
 * misbehaves on the first bash-ism. `pipefail` makes a failed download fail
 * the install instead of feeding an empty script to a shell that exits 0.
 */
export function script({ url, uninstallCommand, binName }: ScriptOptions): Recipe {
  return {
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['bash', '-c', `set -o pipefail; curl -fsSL ${url} | bash`]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, uninstallCommand);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['sh', '-c', `command -v ${binName}`]);
      return result.exitCode === 0;
    },
  };
}
