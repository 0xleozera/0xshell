import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Runner } from '../runner';
import type { Recipe } from '../recipe';
import { runChecked } from './run-checked';

export type AppImageOptions = {
  readonly url: string;
  /** Name the binary is installed as, and looked up on the `PATH`. */
  readonly binName: string;
};

/**
 * Helper for Tools installed as a Linux AppImage (ADR-0002) — the path for
 * Linux apps distributed as a universal AppImage instead of a package. The
 * binary lands in `~/.local/bin`, a user-writable directory that's already
 * on `PATH` on the distros 0xshell targets, so no `sudo` is needed.
 */
export function appImage({ url, binName }: AppImageOptions): Recipe {
  const installDir = join(homedir(), '.local', 'bin');
  const binPath = join(installDir, binName);

  return {
    async install(runner: Runner): Promise<void> {
      await runChecked(runner, ['mkdir', '-p', installDir]);
      await runChecked(runner, ['curl', '-fsSL', url, '-o', binPath]);
      await runChecked(runner, ['chmod', '+x', binPath]);
    },
    async uninstall(runner: Runner): Promise<void> {
      await runChecked(runner, ['rm', '-f', binPath]);
    },
    async isInstalled(runner: Runner): Promise<boolean> {
      const result = await runner.run(['sh', '-c', `command -v ${binName}`]);
      return result.exitCode === 0;
    },
  };
}
