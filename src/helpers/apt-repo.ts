import type { Runner } from '../runner/runner';
import type { Recipe } from '../tool/recipe';
import { runChecked } from './run-checked';

export type AptRepoOptions = {
  /** Short repo name: names the keyring and the file in sources.list.d. */
  readonly repoName: string;
  /** URL of the public (ASCII-armored) GPG key that signs the repository. */
  readonly keyUrl: string;
  /** Base URL of the apt repository, e.g. 'https://packagecloud.io/slacktechnologies/slack/debian/'. */
  readonly repoUrl: string;
  readonly distribution: string;
  readonly components: string;
  readonly packageName: string;
};

/**
 * Helper for Tools installed from a third-party, signed apt repository
 * (ADR-0002). Third-party repositories are signed: the GPG key is imported
 * into its own keyring under /etc/apt/keyrings and referenced through
 * `signed-by` in the source list — the current standard, instead of the
 * deprecated `apt-key`. Without it, `apt update` fails with `NO_PUBKEY`.
 *
 * Command generation lives here in one place, so `sudo` is applied to every
 * write here and not by each Tool that uses this Helper.
 */
export function aptRepo({
  repoName,
  keyUrl,
  repoUrl,
  distribution,
  components,
  packageName,
}: AptRepoOptions): Recipe {
  const keyringPath = `/etc/apt/keyrings/${repoName}.gpg`;
  const sourceListPath = `/etc/apt/sources.list.d/${repoName}.list`;
  const sourceLine = `deb [signed-by=${keyringPath}] ${repoUrl} ${distribution} ${components}`;

  return {
    requiresPrivilege: true,
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['sudo', 'mkdir', '-p', '/etc/apt/keyrings']);
      await runChecked(runner, ['sudo', 'sh', '-c', `curl -fsSL ${keyUrl} | gpg --dearmor -o ${keyringPath}`]);
      await runChecked(runner, ['sudo', 'sh', '-c', `echo "${sourceLine}" > ${sourceListPath}`]);
      await runChecked(runner, ['sudo', 'apt', 'update']);
      await runChecked(runner, ['sudo', 'apt', 'install', '-y', packageName]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, ['sudo', 'apt', 'remove', '-y', packageName]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['dpkg', '-s', packageName]);
      return result.exitCode === 0;
    },
  };
}
