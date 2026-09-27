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
 * A `download` script for a .deb attached to a GitHub release, whose file
 * name carries the version. It takes the newest release that has the asset,
 * not /releases/latest: projects also publish releases with no Linux build
 * at all (Obsidian's mobile-only ones), and "latest" is then one of those.
 * Releases come newest first, so the first match wins. `assetPattern` is an
 * extended regex for the file name.
 */
export function debFromGitHubRelease(repo: string, assetPattern: string): string {
  return (
    `url=$(curl -fsSL "https://api.github.com/repos/${repo}/releases?per_page=20" ` +
    `| grep -oE 'https://github.com/${repo}/releases/download/[^"]+/${assetPattern}' | head -1); ` +
    `[ -n "$url" ] || { echo "no matching .deb in the releases of ${repo}" >&2; exit 1; }; ` +
    `curl -fsSL "$url" -o "$1"`
  );
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
