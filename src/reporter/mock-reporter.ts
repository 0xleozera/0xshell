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
export class MockReporter implements Reporter {
  readonly reports: Report[] = [];

  private record(kind: ReportKind, message: string): void {
    this.reports.push({ kind, message });
  }

  intro(title: string): void {
    this.record('intro', title);
  }

  outro(message: string): void {
    this.record('outro', message);
  }

  task(message: string): ReporterTask {
    this.record('task', message);

    return {
      succeed: (done) => this.record('succeed', done),
      skip: (done) => this.record('skip', done),
      noop: (done) => this.record('noop', done),
      absent: (done) => this.record('absent', done),
      fail: (done) => this.record('fail', done),
    };
  }

  info(message: string): void {
    this.record('info', message);
  }

  warn(message: string): void {
    this.record('warn', message);
  }

  error(message: string): void {
    this.record('error', message);
  }

  line(message: string): void {
    this.record('line', message);
  }

  block(title: string, body: string): void {
    this.record('block', `${title}:\n${body}`);
  }

  messages(...kinds: readonly ReportKind[]): string[] {
    const wanted = new Set<ReportKind>(kinds);
    return this.reports.filter((report) => wanted.has(report.kind)).map((report) => report.message);
  }

  /** The whole run as text, for assertions that only care that something was said. */
  get output(): string {
    return this.reports.map((report) => report.message).join('\n');
  }
}
