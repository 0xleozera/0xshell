import { intro, log, note, outro, spinner } from '@clack/prompts';
import type { Reporter, ReporterTask } from './reporter';

/**
 * `spinner().stop(message, code)` offers three renderings and only three:
 * `0` is the green "done" mark, `1` and `2` are both red. So the split here
 * is deliberately coarse — a line either ended well or demands attention —
 * and the nuance between "installed", "already installed" and "unsupported"
 * lives in the message text, which is exactly how `@clack/prompts`' own
 * `tasks()` helper writes its lines.
 */
const DONE = 0;
const ATTENTION = 2;

/** 128 + SIGINT(2) — the conventional exit code for "killed by Ctrl+C". */
const INTERRUPTED = 130;

/**
 * `spinner().start()` subscribes to `SIGINT` to be able to erase its own
 * frame, and in doing so it takes away Node's default handling — which is to
 * *terminate*. Without this, Ctrl+C in the middle of `install` would rub out
 * the spinner and then calmly carry on installing the other twenty Tools.
 *
 * Registered after `start()`, so clack's own listener still runs first and
 * closes its line before the process goes away. When `run-install-plan.ts`
 * has a sudo session open it registers its handler earlier still and exits
 * first; the spinner is torn down all the same, through the `exit` hook
 * clack installs alongside the signal ones.
 */
function abortOnInterrupt(): void {
  process.exit(INTERRUPTED);
}

/**
 * The Reporter for an interactive terminal, drawn with `@clack/prompts` —
 * the library already in the project for the `--interactive` multiselect and
 * the `--all` confirmation, so the whole CLI speaks with one visual voice.
 *
 * Everything goes to stdout, including `error` — clack draws a single
 * connected stream (`│`), and splitting half of it onto stderr would tear
 * the box apart mid-run. Nothing is lost by it: this Reporter is only ever
 * chosen when stdout is a terminal, and the moment output is piped or
 * redirected `resolve-reporter.ts` hands over to the plain Reporter, which
 * does keep errors on stderr.
 */
export function createClackReporter(): Reporter {
  return {
    intro: (title) => intro(title),
    outro: (message) => outro(message),

    task(message): ReporterTask {
      const s = spinner();
      s.start(message);
      process.once('SIGINT', abortOnInterrupt);
      process.once('SIGTERM', abortOnInterrupt);

      const close = (done: string, code: number) => {
        process.off('SIGINT', abortOnInterrupt);
        process.off('SIGTERM', abortOnInterrupt);
        s.stop(done, code);
      };

      return {
        succeed: (done) => close(done, DONE),
        skip: (done) => close(done, DONE),
        noop: (done) => close(done, DONE),
        absent: (done) => close(done, ATTENTION),
        fail: (done) => close(done, ATTENTION),
      };
    },

    info: (message) => log.info(message),
    warn: (message) => log.warn(message),
    error: (message) => log.error(message),
    line: (message) => log.message(message),
    block: (title, body) => note(body, title),
  };
}
