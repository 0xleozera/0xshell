import type { Runner } from '../runner';
import type { Recipe } from '../recipe';
import { runChecked } from './run-checked';

export type DmgOptions = {
  readonly url: string;
  /** App name as it appears on the mounted volume, without `.app` (e.g. `'Dia'`). */
  readonly appName: string;
};

/**
 * Helper for Tools installed by mounting a `.dmg` and copying the app into
 * `/Applications` (ADR-0002) — the path for macOS apps that don't have a
 * Homebrew cask. The mount point is pinned explicitly (`-mountpoint`) so the
 * copy step doesn't have to parse `hdiutil attach`'s stdout for it.
 *
 * The volume is detached in a `finally` so a failed copy never leaves it
 * mounted.
 */
export function dmg({ url, appName }: DmgOptions): Recipe {
  const dmgPath = `/tmp/0xshell-${appName}.dmg`;
  const mountPoint = `/Volumes/${appName}`;
  const appBundle = `${appName}.app`;
  const appBundlePath = `/Applications/${appBundle}`;

  return {
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['curl', '-fsSL', url, '-o', dmgPath]);
      // Attach runs outside the try: if it fails, nothing is mounted, so the
      // finally below must not attempt to detach a volume that never mounted.
      await runChecked(runner, ['hdiutil', 'attach', dmgPath, '-mountpoint', mountPoint, '-nobrowse', '-quiet']);
      try {
        await runChecked(runner, ['cp', '-R', `${mountPoint}/${appBundle}`, '/Applications/']);
      } finally {
        await runner.run(['hdiutil', 'detach', mountPoint, '-quiet']);
      }
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, ['rm', '-rf', appBundlePath]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['test', '-d', appBundlePath]);
      return result.exitCode === 0;
    },
  };
}
