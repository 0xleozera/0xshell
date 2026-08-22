#!/usr/bin/env bun
import { createCli, FailedToExitError } from 'trpc-cli';
import { createCliContext } from './lib/context';
import { exitCodeFor, exitCodeForResult, messageFor } from './lib/errors';
import { resolveReporter } from './lib/resolve-reporter';
import { clackPrompts } from './prompts/tools';
import { router } from './router';

const reporter = resolveReporter();
let exitCode = 0;

/**
 * trpc-cli always ends by calling `process.exit`. Recording the code instead
 * of exiting is what keeps the exit-code table in `lib/errors.ts` the only
 * place a number is decided: trpc-cli then throws `FailedToExitError`
 * carrying the reason — the command's result on the way out, the thrown
 * error on the way down.
 */
const exit = (code: number): never => {
  exitCode = code;
  return undefined as never;
};

try {
  const context = createCliContext(reporter, clackPrompts);

  await createCli({ router, name: '0xshell', context }).run({
    // Commands report through the Reporter as they go, so their return value
    // is data, not output; only commander's own text (`--help`) is printed.
    logger: {
      info: (value) => {
        if (typeof value === 'string') {
          process.stdout.write(`${value}\n`);
        }
      },
      error: (message) => reporter.error(String(message)),
    },
    formatError: messageFor,
    // This CLI owns its prompting (`prompts/`); trpc-cli must not open a
    // second one for whatever input it considers missing.
    prompts: false,
    process: { exit },
  });
} catch (error) {
  if (error instanceof FailedToExitError) {
    exitCode = exitCode === 0 ? exitCodeForResult(error.cause) : exitCodeFor(error.cause);
  } else {
    reporter.error(messageFor(error));
    exitCode = exitCodeFor(error);
  }
}

process.exitCode = exitCode;
