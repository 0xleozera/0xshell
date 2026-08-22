import { isSummarized } from './summary';

/**
 * Why the CLI stopped, in the vocabulary of the shell that called it.
 * `failed` is the run that legitimately could not do its job, `usage` the
 * invocation that was wrong before anything ran, `cancelled` the human who
 * hit Ctrl+C.
 */
export type CliErrorCode = 'usage' | 'cancelled' | 'failed';

/** 130 is 128 + SIGINT, what a shell expects back from a Ctrl+C. */
const EXIT_CODE: Record<CliErrorCode, number> = {
  failed: 1,
  usage: 2,
  cancelled: 130,
};

const UNEXPECTED_EXIT_CODE = 1;

/**
 * The only error type the CLI throws on purpose, and the only class in the
 * project: `instanceof` at the edge (`cli.ts`) is what turns a code into an
 * exit number, and nothing below the edge knows those numbers exist.
 */
export class CliError extends Error {
  constructor(
    readonly code: CliErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
  }
}

export function exitCodeFor(error: unknown): number {
  return error instanceof CliError ? EXIT_CODE[error.code] : UNEXPECTED_EXIT_CODE;
}

/**
 * Exit code for a command that ran to completion. A run that collected
 * failures still has to fail the shell — `0xshell doctor && …` is the whole
 * point of the code — so the count travels back in the command's result
 * instead of the command reaching for `process.exitCode` itself.
 */
export function exitCodeForResult(result: unknown): number {
  return isSummarized(result) && result.summary.failed > 0 ? EXIT_CODE.failed : 0;
}

/**
 * What the user reads when it goes wrong: the message, never the stack. A
 * stack trace by default teaches people to ignore the CLI's errors.
 */
export function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
