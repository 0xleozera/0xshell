import type { Runner } from '../runner/runner';
import type { Recipe } from '../tool/recipe';

export type AptRepoOptions = {
  /** apt-addable source: a PPA (`ppa:slack/slack`) or a full `deb ...` line. */
  readonly repo: string;
  readonly packageName: string;
};

/**
 * Helper for Tools installed from a third-party apt repository (ADR-0002).
 * Command generation lives here in one place — #8 adds `sudo` by editing
 * these three methods, not by touching every Tool that uses this Helper.
 */
export function aptRepo({ repo, packageName }: AptRepoOptions): Recipe {
  return {
    async install(runner: Runner): Promise<void> {
      await runner.run(['add-apt-repository', '-y', repo]);
      await runner.run(['apt', 'update']);
      await runner.run(['apt', 'install', '-y', packageName]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runner.run(['apt', 'remove', '-y', packageName]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['dpkg', '-s', packageName]);
      return result.exitCode === 0;
    },
  };
}
