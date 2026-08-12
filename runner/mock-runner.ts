import type { Command, RunResult, Runner } from './runner';

type PartialResult = Partial<RunResult>;

const OK: RunResult = { exitCode: 0, stdout: '', stderr: '' };

function key(command: Command): string {
  return command.join(' ');
}

function toRunResult(partial: PartialResult): RunResult {
  return {
    exitCode: partial.exitCode ?? 0,
    stdout: partial.stdout ?? '',
    stderr: partial.stderr ?? '',
  };
}

/**
 * Test double for Runner (ADR-0003). Records every command it was asked to
 * run, and lets a test program a response — or a failure — per command
 * before the code under test runs.
 *
 * const runner = new MockRunner();
 * runner.respondTo(['brew', 'list', '--cask', 'slack'], { exitCode: 1 }); // not installed
 *
 * ... exercise code ...
 *
 * expect(runner.wasRun(['brew', 'install', '--cask', 'slack'])).toBe(true);
 */
export class MockRunner implements Runner {
  readonly commands: Command[] = [];
  private readonly responses = new Map<string, RunResult>();

  /** Program the result returned the next time this exact command runs. */
  respondTo(command: Command, response: PartialResult = {}): void {
    this.responses.set(key(command), toRunResult(response));
  }

  /** Shorthand for respondTo with a non-zero exit code. */
  failOn(command: Command, response: PartialResult = {}): void {
    this.respondTo(command, { exitCode: 1, ...response });
  }

  async run(command: Command): Promise<RunResult> {
    this.commands.push(command);
    return this.responses.get(key(command)) ?? OK;
  }

  /** Whether this exact command was ever run. */
  wasRun(command: Command): boolean {
    return this.commands.some((executed) => key(executed) === key(command));
  }
}
