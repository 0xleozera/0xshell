import type { Runner } from '../runner/runner';
import type { Recipe } from '../tool/recipe';

/** Helper for Tools installed as a Homebrew formula (ADR-0002). */
export function brewFormula(formulaName: string): Recipe {
  return {
    async install(runner: Runner): Promise<void> {
      await runner.run(['brew', 'install', formulaName]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runner.run(['brew', 'uninstall', formulaName]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['brew', 'list', formulaName]);
      return result.exitCode === 0;
    },
  };
}
