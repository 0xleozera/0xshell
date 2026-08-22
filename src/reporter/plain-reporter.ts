import type { Reporter, ReporterTask } from './reporter';

/**
 * Glyph per ending, kept as the CLI's stable machine-facing vocabulary:
 * these are the exact markers the commands printed before the Reporter
 * existed, so a script that greps `^✗` keeps working.
 */
const GLYPH = {
  succeed: '✓',
  skip: '⊘',
  noop: '=',
  absent: '✗',
  fail: '✗',
} as const;

export type PlainReporterOptions = {
  readonly out?: (message: string) => void;
  readonly err?: (message: string) => void;
};

/**
 * The Reporter for everything that is not an interactive terminal: a pipe,
 * a file, a CI log, `TERM=dumb`. One line in, one line out, no ANSI, no
 * animation, no cursor movement.
 *
 * The rule it follows is that **decoration is dropped and information is
 * kept**: `intro`/`outro` print nothing, since a banner is worth nothing in
 * a log file, while every Tool line, every warning and the closing summary
 * come out verbatim — and errors stay on stderr, which is the half of the
 * contract an interactive TUI cannot honor (see `clack-reporter.ts`).
 *
 * `task()` prints nothing when it opens: progress is a terminal affordance,
 * and doubling every Tool's line in a CI log to say "starting" would only
 * make it harder to read.
 */
export function createPlainReporter(options: PlainReporterOptions = {}): Reporter {
  const out = options.out ?? ((message: string) => console.log(message));
  const err = options.err ?? ((message: string) => console.error(message));

  return {
    intro(): void {},
    outro(): void {},

    task(): ReporterTask {
      return {
        succeed: (message) => out(`${GLYPH.succeed} ${message}`),
        skip: (message) => out(`${GLYPH.skip} ${message}`),
        noop: (message) => out(`${GLYPH.noop} ${message}`),
        absent: (message) => out(`${GLYPH.absent} ${message}`),
        fail: (message) => err(`${GLYPH.fail} ${message}`),
      };
    },

    info: (message) => out(message),
    warn: (message) => out(message),
    error: (message) => err(message),
    line: (message) => out(message),
    block: (title, body) => out(`${title}:\n${body}`),
  };
}
