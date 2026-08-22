import type { Runner } from '../runner';
import type { Recipe } from '../recipe';
import { runChecked } from './run-checked';

/**
 * Helper for Tools installed as a Homebrew cask (ADR-0002). `caskId` accepts
 * both a core cask name (`slack`) and a tap-qualified name
 * (`stablyai/orca/orca`) — Homebrew resolves either form for `install`,
 * `uninstall` and `list`, and auto-taps on install when the tap isn't known
 * yet, so the id is passed straight through to every command.
 */
export function brewCask(caskId: string): Recipe {
  return {
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['brew', 'install', '--cask', caskId]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, ['brew', 'uninstall', '--cask', caskId]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['brew', 'list', '--cask', caskId]);
      return result.exitCode === 0;
    },
  };
}
