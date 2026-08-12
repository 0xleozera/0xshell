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
 * The single seam between sshell and the machine (ADR-0003). Every Helper
 * runs commands through a Runner instead of calling `Bun.$` directly, so
 * tests can swap in a mock and assert on the commands produced without
 * touching the real shell.
 */
export interface Runner {
  run(command: Command): Promise<RunResult>;
}
