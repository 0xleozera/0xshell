import { createClackReporter } from './clack-reporter';
import { createPlainReporter } from './plain-reporter';
import type { Reporter } from './reporter';

export type ReporterEnvironment = {
  /** `process.stdout.isTTY` — undefined when stdout is a pipe or a file. */
  readonly isTTY?: boolean;
  readonly env?: Record<string, string | undefined>;
};

/**
 * Picks the Reporter for the environment the CLI was started in, at the
 * composition root (`index.ts`) — the one place allowed to look at the real
 * `process`.
 *
 * The animated rendering is opt-out by circumstance, never by guesswork:
 * it needs stdout to be a terminal, and it stands down for `CI` (where
 * spinner frames become thousands of junk lines in the build log) and for
 * `TERM=dumb` (a terminal that has told us it cannot do cursor movement).
 * Every other case — `0xshell doctor | grep`, `> setup.log`, a `bun test`
 * run — lands on the plain Reporter, whose output is stable and greppable.
 */
export function resolveReporter(environment: ReporterEnvironment = {}): Reporter {
  const isTTY = environment.isTTY ?? Boolean(process.stdout.isTTY);
  const env = environment.env ?? process.env;

  const interactive = isTTY && !env.CI && env.TERM !== 'dumb';

  return interactive ? createClackReporter() : createPlainReporter();
}
