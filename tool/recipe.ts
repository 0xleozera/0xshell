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
 *
 * `requiresPrivilege` declares, at the source (the Helper that builds the
 * Recipe), that `install()`/`uninstall()` need root — `apt` and `aptRepo`
 * are the only Helpers that set it. The install engine reads this flag
 * across the resolved plan to decide, once, whether to open a sudo session
 * before running anything; it never inspects command strings to guess.
 */
export interface Recipe {
  readonly requiresPrivilege?: boolean;
  install(runner: Runner): Promise<void>;
  uninstall(runner: Runner): Promise<void>;
  isInstalled(runner: Runner): Promise<boolean>;
}
