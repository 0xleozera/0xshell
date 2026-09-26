import type { Runner } from '../runner';
import type { Recipe } from '../recipe';
import { isDpkgInstalled } from './apt';
import { aptGetInstall, aptGetRemove, aptGetUpdate } from './apt-get';
import { runChecked } from './run-checked';

export type AptRepoOptions = {
  /**
   * Short repo name: names the keyring and the file in sources.list.d. When
   * the package writes its own source on install (Warp does), use the name
   * the package uses — it only writes one when that file is missing, and two
   * sources for the same URL with different keyrings break `apt update`.
   */
  readonly repoName: string;
  /** URL of the public (ASCII-armored) GPG key that signs the repository. */
  readonly keyUrl: string;
  /** Base URL of the apt repository, e.g. 'https://packagecloud.io/slacktechnologies/slack/debian/'. */
  readonly repoUrl: string;
  readonly distribution: string;
  readonly components: string;
  readonly packageName: string;
  /**
   * Files the package's own scripts write outside dpkg's bookkeeping — its
   * own copy of the source and keyring, a cron job that re-adds them — which
   * `apt remove` leaves behind. `uninstall()` removes them with ours, and
   * `install()` clears stale ones before writing its source. Shell globs are
   * allowed; these are constants of the Tool module, never input.
   */
  readonly leftovers?: readonly string[];
};

/** Where `aptRepo` keeps a repository's keyring and source line. */
export function aptRepoPaths(repoName: string): { readonly keyringPath: string; readonly sourceListPath: string } {
  return {
    keyringPath: `/etc/apt/keyrings/${repoName}.gpg`,
    sourceListPath: `/etc/apt/sources.list.d/${repoName}.list`,
  };
}

/**
 * Helper for Tools installed from a third-party, signed apt repository
 * (ADR-0002). Third-party repositories are signed: the GPG key is imported
 * into its own keyring under /etc/apt/keyrings and referenced through
 * `signed-by` in the source list — the current standard, instead of the
 * deprecated `apt-key`. Without it, `apt update` fails with `NO_PUBKEY`.
 *
 * `uninstall()` takes the repository away with the package: a source left
 * behind keeps being fetched by every `apt update`, and one that goes stale
 * fails them all. For the same reason, an install that fails once the source
 * is written takes it back out before reporting the failure — a repository
 * whose key changed would otherwise break every apt Tool after it.
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
  leftovers = [],
}: AptRepoOptions): Recipe {
  const { keyringPath, sourceListPath } = aptRepoPaths(repoName);
  const sourceLine = `deb [signed-by=${keyringPath}] ${repoUrl} ${distribution} ${components}`.trimEnd();

  // Through a shell, so a leftover can be a glob: Spotify dates the name of
  // the key it installs.
  async function removeLeftovers(runner: Runner): Promise<void> {
    if (leftovers.length > 0) {
      await runChecked(runner, ['sudo', 'sh', '-c', `rm -rf ${leftovers.join(' ')}`]);
    }
  }

  return {
    requiresPrivilege: true,
    async install(runner: Runner): Promise<void> {
      // A source the package wrote on an earlier install, signed by another
      // keyring, makes apt refuse the one written below ("Conflicting values
      // set for option Signed-By"). The package writes it again on install.
      await removeLeftovers(runner);
      await runChecked(runner, ['sudo', 'mkdir', '-p', '/etc/apt/keyrings']);
      // --batch --yes: a keyring left by an earlier install is overwritten
      // instead of gpg asking about it on a terminal it does not have.
      await runChecked(runner, [
        'sudo',
        'sh',
        '-c',
        `curl -fsSL ${keyUrl} | gpg --batch --yes --dearmor -o ${keyringPath}`,
      ]);
      await runChecked(runner, ['sudo', 'sh', '-c', `echo "${sourceLine}" > ${sourceListPath}`]);
      try {
        await runChecked(runner, aptGetUpdate());
        await runChecked(runner, aptGetInstall(packageName));
      } catch (error) {
        await runner.run(['sudo', 'rm', '-f', sourceListPath, keyringPath]);
        throw error;
      }
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, aptGetRemove(packageName));
      await runChecked(runner, ['sudo', 'rm', '-f', sourceListPath, keyringPath]);
      await removeLeftovers(runner);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      return isDpkgInstalled(runner, packageName);
    },
  };
}
