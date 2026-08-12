import type { Runner } from '../runner/runner';

/**
 * What a Helper (e.g. brewCask) produces for one platform: the install /
 * uninstall actions and the installed-check, all running through a Runner.
 */
export interface Recipe {
  install(runner: Runner): Promise<void>;
  uninstall(runner: Runner): Promise<void>;
  isInstalled(runner: Runner): Promise<boolean>;
}
