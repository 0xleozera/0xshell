import type { Runner } from '../runner';
import type { Recipe } from '../recipe';
import { runChecked } from './run-checked';

/**
 * Helper for Tools installed as an apt package (ADR-0002). `install()` and
 * `uninstall()` write to the system, so each runs under `sudo` individually
 * — the CLI process itself never runs as root. `isInstalled()` only reads
 * `dpkg`, so it needs no privilege.
 */
export function apt(packageName: string): Recipe {
  return {
    requiresPrivilege: true,
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['sudo', 'apt', 'install', '-y', packageName]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, ['sudo', 'apt', 'remove', '-y', packageName]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['dpkg', '-s', packageName]);
      return result.exitCode === 0;
    },
  };
}
