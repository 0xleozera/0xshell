/**
 * The line of a single Tool while its command works on it. A Reporter opens
 * one with `task()` *before* the work starts — so a slow `brew install` shows
 * as in progress instead of as silence — and it is closed exactly once, with
 * the wording of that Tool's Outcome, as soon as it is known.
 *
 * The five closers exist because the CLI already distinguishes five endings,
 * and each one had its own glyph before the Reporter existed. The message
 * passed in never carries the glyph: picking it (and the color, and the
 * stream) is the Reporter's job, which is what lets the same command render
 * as an animated line in a terminal and as a plain greppable line in a pipe.
 */
export interface ReporterTask {
  /** The action ran, or the machine was already in the target state (`✓`). */
  succeed(message: string): void;
  /** Unsupported on this Platform — nothing was done, and nothing should be (`⊘`). */
  skip(message: string): void;
  /** Nothing to do, as reported by a dry run (`=`). */
  noop(message: string): void;
  /** Found missing, which is `doctor`'s normal finding and not an error (`✗`). */
  absent(message: string): void;
  /** The action failed (`✗`, on stderr when the streams are separate). */
  fail(message: string): void;
}

/**
 * The single seam between 0xshell and the user's terminal, in the same
 * spirit as `Runner` is the single seam to the machine (ADR-0003, ADR-0004).
 * No command calls `console.*` directly: they describe *what* happened and
 * the Reporter decides how it looks.
 *
 * Two implementations ship: `clack-reporter.ts` for an interactive terminal
 * and `plain-reporter.ts` for everything else (pipes, CI, `TERM=dumb`).
 * `resolve-reporter.ts` picks between them.
 */
export interface Reporter {
  /** Decoration only — dropped when the output isn't a terminal. */
  intro(title: string): void;
  /** Decoration only — dropped when the output isn't a terminal. */
  outro(message: string): void;
  task(message: string): ReporterTask;
  info(message: string): void;
  warn(message: string): void;
  /** An error the user has to act on (stderr when the streams are separate). */
  error(message: string): void;
  /** A line that carries its own formatting — a `list` row, a dry-run command. */
  line(message: string): void;
  /** A titled block, set apart from the lines above it — the closing summary. */
  block(title: string, body: string): void;
}
