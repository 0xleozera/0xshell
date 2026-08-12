import type { Runner } from '../runner/runner';
import type { Recipe } from '../tool/recipe';
import { runChecked } from './run-checked';

/**
 * Helper for Tools installed as a mise-managed runtime (ADR-0002) — the
 * path every runtime in the Catálogo goes through. `toolId` is whatever
 * mise itself accepts as the tool identifier: a bare name (`bun`, `go`) or
 * a backend-qualified one (`aqua:neovim/neovim`).
 */
export function mise(toolId: string): Recipe {
  return {
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['mise', 'install', toolId]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, ['mise', 'uninstall', toolId]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['mise', 'ls', toolId]);
      return result.exitCode === 0 && result.stdout.trim().length > 0;
    },
  };
}
