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

export type MockRunner = Runner & {
  readonly commands: Command[];
  respondTo(command: Command, response?: PartialResult): void;
  failOn(command: Command, response?: PartialResult): void;
  wasRun(command: Command): boolean;
};

/**
 * Test double for Runner (ADR-0003). Records every command it was asked to
 * run, and lets a test program a response — or a failure — per command
 * before the code under test runs. Commands not programmed always succeed.
 */
export function createMockRunner(): MockRunner {
  const commands: Command[] = [];
  const responses = new Map<string, RunResult>();

  return {
    commands,

    respondTo(command: Command, response: PartialResult = {}): void {
      responses.set(key(command), toRunResult(response));
    },

    failOn(command: Command, response: PartialResult = {}): void {
      responses.set(key(command), toRunResult({ exitCode: 1, ...response }));
    },

    async run(command: Command): Promise<RunResult> {
      commands.push(command);
      return responses.get(key(command)) ?? OK;
    },

    wasRun(command: Command): boolean {
      return commands.some((executed) => key(executed) === key(command));
    },
  };
}
