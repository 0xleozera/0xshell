import { $ } from 'bun';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

/**
 * A shell command as an argv array (no string concatenation, no shell injection).
 * `['brew', 'install', '--cask', 'slack']`, not `'brew install --cask slack'`.
 */
export type Command = readonly string[];

export type RunResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

/**
 * The single seam between 0xshell and the machine (ADR-0003). Every Helper
 * runs commands through a Runner instead of calling `Bun.$` directly, so
 * tests can swap in a mock and assert on the commands produced without
 * touching the real shell.
 */
export interface Runner {
  run(command: Command): Promise<RunResult>;
}

/**
 * `~/.local/bin` first on the PATH, if it is not there already. The script
 * installers (mise, claude, cursor) put their binaries there, but a login
 * shell only adds it when it existed at login — on a new machine it does
 * not, and `mise use` would fail right after mise was installed.
 */
export function withUserBin(path: string, home: string): string {
  const userBin = join(home, '.local', 'bin');
  const entries = path.split(delimiter).filter((entry) => entry.length > 0);
  return entries.includes(userBin) ? path : [userBin, ...entries].join(delimiter);
}

/** Production Runner. The only place allowed to touch `Bun.$` (ADR-0003). */
export function createBunRunner(home: string = homedir()): Runner {
  const env = { ...process.env, PATH: withUserBin(process.env.PATH ?? '', home) };

  return {
    async run(command: Command): Promise<RunResult> {
      const result = await $`${command}`.env(env).nothrow().quiet();
      return {
        exitCode: result.exitCode,
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
      };
    },
  };
}
