import type { Command } from '../runner';

/**
 * `apt-get` under `sudo`, the way every apt write in the Catalog runs it:
 *
 *  - `apt-get`, not `apt`: `apt` has no stable CLI and says so on stderr.
 *  - `DEBIAN_FRONTEND=noninteractive`: a debconf question would otherwise
 *    wait on a terminal nobody is watching. Passed through `env` because
 *    sudo only forwards a `VAR=value` argument when the sudoers rule allows it.
 *  - `DPkg::Lock::Timeout`: on a machine fresh out of the installer,
 *    unattended-upgrades holds the dpkg lock for minutes; waiting for it
 *    beats failing on "Could not get lock".
 */
export function aptGet(...args: readonly string[]): Command {
  return ['sudo', 'env', 'DEBIAN_FRONTEND=noninteractive', 'apt-get', '-o', 'DPkg::Lock::Timeout=600', ...args];
}

/** Installs packages, answering yes. */
export function aptGetInstall(...packages: readonly string[]): Command {
  return aptGet('install', '-y', ...packages);
}

/**
 * Removes packages and the dependencies they pulled in that nothing else
 * needs anymore. `remove`, never `purge`: the package's configuration stays
 * (ADR-0001).
 */
export function aptGetRemove(...packages: readonly string[]): Command {
  return aptGet('remove', '--autoremove', '-y', ...packages);
}

export function aptGetUpdate(): Command {
  return aptGet('update');
}
