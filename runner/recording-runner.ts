import type { Command, RunResult, Runner } from './runner';

const OK: RunResult = { exitCode: 0, stdout: '', stderr: '' };

/**
 * Runner that records every command instead of running it (issue #6).
 * `install --dry-run` passes one of these into a Recipe's `install()` /
 * `uninstall()` so it can show the exact commands a real run would issue —
 * without ever reaching the real Runner. Unlike `MockRunner`, it has no
 * per-command scripting: every command always "succeeds", since a dry run
 * has nothing to react to a failure with.
 */
export class RecordingRunner implements Runner {
  readonly commands: Command[] = [];

  async run(command: Command): Promise<RunResult> {
    this.commands.push(command);
    return OK;
  }
}
