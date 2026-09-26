import type { Runner } from '../runner';
import type { Recipe } from '../recipe';
import { isDpkgInstalled } from './apt';
import { aptGetInstall, aptGetRemove } from './apt-get';
import { runChecked } from './run-checked';

export type DebOptions = {
  /** The package the .deb installs — what `dpkg` and `apt` know it by. */
  readonly packageName: string;
  /**
   * `sh` script that writes the .deb to the path it gets as `$1`. A script,
   * not a URL, because some vendors only publish a versioned file name that
   * has to be looked up first (see `debFromUrl` for the plain case).
   */
  readonly download: string;
};

/** A `download` script for a vendor URL that always serves the latest .deb. */
export function debFromUrl(url: string): string {
  return `curl -fsSL "${url}" -o "$1"`;
}

/**
 * Helper for Linux apps published as a standalone .deb, with no apt
 * repository behind it (ADR-0002). `apt-get install` on the downloaded file,
 * not `dpkg -i`, so the package's dependencies come along; the download is
 * removed whether or not apt succeeds.
 */
export function deb({ packageName, download }: DebOptions): Recipe {
  const debPath = `/tmp/0xshell-${packageName}.deb`;

  return {
    requiresPrivilege: true,
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['sh', '-c', `set -eu; ${download}`, 'sh', debPath]);
      try {
        await runChecked(runner, aptGetInstall(debPath));
      } finally {
        await runner.run(['rm', '-f', debPath]);
      }
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, aptGetRemove(packageName));
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      return isDpkgInstalled(runner, packageName);
    },
  };
}
