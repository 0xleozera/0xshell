import type { Command, Runner } from '../runner/runner';
import type { Recipe } from '../tool/recipe';
import { runChecked } from './run-checked';

export type ScriptOptions = {
  readonly url: string;
  /** Command that undoes the install — remote scripts have no common uninstall path, so the Tool supplies it. */
  readonly uninstallCommand: Command;
  readonly binName: string;
};

/**
 * Helper for Tools installed by piping a remote script into `sh` (ADR-0002)
 * — `curl | sh`, the classic third-party installer. The pipe needs a shell,
 * so `install()` is the one place in this Helper that reaches for `sh -c`.
 */
export function script({ url, uninstallCommand, binName }: ScriptOptions): Recipe {
  return {
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['sh', '-c', `curl -fsSL ${url} | sh`]);
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
