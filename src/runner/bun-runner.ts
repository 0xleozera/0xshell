import { $ } from 'bun';
import type { Command, RunResult, Runner } from './runner';

/** Production Runner. The only file allowed to touch `Bun.$` (ADR-0003). */
export class BunRunner implements Runner {
  async run(command: Command): Promise<RunResult> {
    const result = await $`${command}`.nothrow().quiet();
    return {
      exitCode: result.exitCode,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    };
  }
}
