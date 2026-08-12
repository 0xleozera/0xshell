import type { Runner } from '../runner/runner';
import type { Recipe } from '../tool/recipe';
import { runChecked } from './run-checked';

/** Helper for Tools installed as an apt package (ADR-0002). */
export function apt(packageName: string): Recipe {
  return {
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['apt', 'install', '-y', packageName]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, ['apt', 'remove', '-y', packageName]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['dpkg', '-s', packageName]);
      return result.exitCode === 0;
    },
  };
}
