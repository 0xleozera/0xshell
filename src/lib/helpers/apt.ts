import type { Runner } from '../runner';
import type { Recipe } from '../recipe';
import { aptGetInstall, aptGetRemove } from './apt-get';
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
      await runChecked(runner, aptGetInstall(packageName));
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, aptGetRemove(packageName));
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      return isDpkgInstalled(runner, packageName);
    },
  };
}

/**
 * `dpkg -s` alone exits 0 for a package that was removed but not purged
 * (`deinstall ok config-files`), so the status line is what decides.
 */
export async function isDpkgInstalled(runner: Runner, packageName: string): Promise<boolean> {
  const result = await runner.run(['dpkg-query', '-W', '-f=${Status}', packageName]);
  return result.exitCode === 0 && result.stdout.trim() === 'install ok installed';
}
