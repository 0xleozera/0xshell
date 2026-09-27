import type { Runner } from '../runner';
import type { Recipe } from '../recipe';
import { runChecked } from './run-checked';

/**
 * Helper for Tools installed as a mise-managed runtime (ADR-0002) — the
 * path every runtime in the Catalog goes through. `toolId` is whatever
 * mise itself accepts as the tool identifier: a bare name (`bun`, `go`) or
 * a backend-qualified one (`aqua:neovim/neovim`).
 *
 * `mise use --global`, not `mise install`: an installed version that no
 * config file asks for is never put on the PATH, so `node` would still be
 * "not found" after an install that reported success. The global config
 * (`~/.config/mise/config.toml`) pins it at `latest`, and "installed" means
 * both halves: asked for there and present on disk.
 */
export function mise(toolId: string): Recipe {
  return {
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['mise', 'use', '--global', `${toolId}@latest`]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, ['mise', 'use', '--global', '--remove', toolId]);
      await runChecked(runner, ['mise', 'uninstall', '--all', toolId]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['mise', 'ls', '--global', '--installed', toolId]);
      return result.exitCode === 0 && result.stdout.trim().length > 0;
    },
  };
}
