import type { Runner } from '../runner';
import type { Recipe } from '../recipe';
import { runChecked } from './run-checked';

/** Helper for Tools installed as a Homebrew formula (ADR-0002). */
export function brewFormula(formulaName: string): Recipe {
  return {
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['brew', 'install', formulaName]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, ['brew', 'uninstall', formulaName]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['brew', 'list', formulaName]);
      return result.exitCode === 0;
    },
  };
}
