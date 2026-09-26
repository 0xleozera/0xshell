import type { Outcome } from './outcome';

export type Failure = {
  readonly id: string;
  readonly error: string;
};

export type Summary = {
  readonly installed: number;
  readonly alreadyInstalled: number;
  readonly unsupported: number;
  readonly failed: number;
  readonly failures: readonly Failure[];
};

/** What every command that runs a plan hands back, and the shape `exitCodeForResult` reads. */
export type Summarized = {
  readonly summary: Summary;
};

function count(outcomes: readonly Outcome[], status: Outcome['status']): number {
  return outcomes.filter((outcome) => outcome.status === status).length;
}

/** Tallies the four counts reused by install, doctor and uninstall. */
export function summarize(outcomes: readonly Outcome[]): Summary {
  const failures = outcomes
    .filter((outcome) => outcome.status === 'failed')
    .map((outcome) => ({ id: outcome.id, error: outcome.error }));

  return {
    installed: count(outcomes, 'installed'),
    alreadyInstalled: count(outcomes, 'already-installed'),
    unsupported: count(outcomes, 'unsupported'),
    failed: failures.length,
    failures,
  };
}

/**
 * Recognises a command result carrying a Summary, so the edge can read the
 * failure count off it without every command having to agree on a wider
 * shape.
 */
export function isSummarized(value: unknown): value is Summarized {
  if (typeof value !== 'object' || value === null || !('summary' in value)) {
    return false;
  }

  const { summary } = value;
  return typeof summary === 'object' && summary !== null && 'failed' in summary && typeof summary.failed === 'number';
}

/**
 * Title the summary block is filed under. It is not part of the body: the
 * Reporter (ADR-0004) draws the title itself — as a heading in a plain log,
 * as the label of a framed block in a terminal — so the body here is only
 * the counts.
 */
export const SUMMARY_TITLE = 'Summary';

/**
 * The failure detail is identical in every command's summary block — only
 * the four count labels change with the direction of the run, and those
 * live with the command that names them.
 */
export function formatFailures(summary: Summary): readonly string[] {
  if (summary.failures.length === 0) {
    return [];
  }

  return ['Failures:', ...summary.failures.map((failure) => `  ✗ ${failure.id}: ${failure.error}`)];
}
