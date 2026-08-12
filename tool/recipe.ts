import type { Runner } from '../runner/runner';

/**
 * What a Helper (e.g. brewCask) produces for one platform: the install /
 * uninstall actions and the installed-check, all running through a Runner.
 *
 * `install()` and `uninstall()` throw when the underlying command exits
 * non-zero (see `helpers/run-checked.ts`) — the Runner itself never throws,
 * so a swallowed exit code would look like success to whoever awaits these.
 * `isInstalled()` never throws: a non-zero exit from its check command is
 * the legitimate "not installed" answer, so it resolves to `false` instead.
 */
export interface Recipe {
  install(runner: Runner): Promise<void>;
  uninstall(runner: Runner): Promise<void>;
  isInstalled(runner: Runner): Promise<boolean>;
}
