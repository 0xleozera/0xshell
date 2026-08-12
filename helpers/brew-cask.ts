import type { Runner } from '../runner/runner';
import type { Recipe } from '../tool/recipe';

/** Helper for Tools installed as a Homebrew cask (ADR-0002). */
export function brewCask(caskId: string): Recipe {
  return {
    async install(runner: Runner): Promise<void> {
      await runner.run(['brew', 'install', '--cask', caskId]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runner.run(['brew', 'uninstall', '--cask', caskId]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['brew', 'list', '--cask', caskId]);
      return result.exitCode === 0;
    },
  };
}
