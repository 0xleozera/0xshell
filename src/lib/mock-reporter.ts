import type { Reporter, ReporterTask } from './reporter';

export type ReportKind =
  | 'intro'
  | 'outro'
  | 'task'
  | 'succeed'
  | 'skip'
  | 'noop'
  | 'absent'
  | 'fail'
  | 'info'
  | 'warn'
  | 'error'
  | 'line'
  | 'block';

export type Report = {
  readonly kind: ReportKind;
  readonly message: string;
};

export type MockReporter = Reporter & {
  readonly reports: Report[];
  messages(...kinds: readonly ReportKind[]): string[];
  /** The whole run as text, for assertions that only care that something was said. */
  readonly output: string;
};

/**
 * Test double for Reporter (ADR-0004), the counterpart of `MockRunner`.
 * Records every call in order, so a test can assert on what the command
 * *reported* — `{ kind: 'skip', message: 'xcode não suportado…' }` — instead
 * of on the glyphs and colors of one particular rendering.
 *
 * `task()` is recorded too: its `kind: 'task'` entry is the in-progress line,
 * which is the only way to check that a Tool's line opens before its command
 * runs and not after it.
 */
export function createMockReporter(): MockReporter {
  const reports: Report[] = [];
  const record = (kind: ReportKind, message: string): void => {
    reports.push({ kind, message });
  };

  return {
    reports,

    intro: (title) => record('intro', title),
    outro: (message) => record('outro', message),

    task(message): ReporterTask {
      record('task', message);

      return {
        succeed: (done) => record('succeed', done),
        skip: (done) => record('skip', done),
        noop: (done) => record('noop', done),
        absent: (done) => record('absent', done),
        fail: (done) => record('fail', done),
      };
    },

    info: (message) => record('info', message),
    warn: (message) => record('warn', message),
    error: (message) => record('error', message),
    line: (message) => record('line', message),
    block: (title, body) => record('block', `${title}:\n${body}`),

    messages(...kinds: readonly ReportKind[]): string[] {
      const wanted = new Set<ReportKind>(kinds);
      return reports.filter((report) => wanted.has(report.kind)).map((report) => report.message);
    },

    get output(): string {
      return reports.map((report) => report.message).join('\n');
    },
  };
}
