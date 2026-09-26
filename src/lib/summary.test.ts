import { describe, expect, test } from 'bun:test';
import type { Outcome } from './outcome';
import { formatFailures, isSummarized, summarize } from './summary';

describe('summarize', () => {
  test('tallies the four counts and the detail of each failure', () => {
    const outcomes: Outcome[] = [
      { status: 'installed', id: 'slack' },
      { status: 'installed', id: 'mise' },
      { status: 'already-installed', id: 'git' },
      { status: 'unsupported', id: 'xcode', reason: 'Apple-only tool' },
      { status: 'failed', id: 'docker', error: 'network unreachable' },
    ];

    const summary = summarize(outcomes);

    expect(summary).toEqual({
      installed: 2,
      alreadyInstalled: 1,
      unsupported: 1,
      failed: 1,
      failures: [{ id: 'docker', error: 'network unreachable' }],
    });
  });

  test('returns all-zero counts for an empty plan', () => {
    expect(summarize([])).toEqual({
      installed: 0,
      alreadyInstalled: 0,
      unsupported: 0,
      failed: 0,
      failures: [],
    });
  });
});

describe('formatFailures', () => {
  test('lists each failure under a header', () => {
    const summary = summarize([{ status: 'failed', id: 'docker', error: 'network unreachable' }]);

    expect(formatFailures(summary)).toEqual(['Failures:', '  ✗ docker: network unreachable']);
  });

  test('says nothing at all when nothing failed', () => {
    expect(formatFailures(summarize([{ status: 'installed', id: 'slack' }]))).toEqual([]);
  });
});

describe('isSummarized', () => {
  test('recognises a command result carrying a Summary', () => {
    expect(isSummarized({ summary: summarize([]) })).toBe(true);
  });

  test('rejects results that carry no Summary', () => {
    expect(isSummarized({ dryRun: true, plan: [] })).toBe(false);
    expect(isSummarized({ summary: 'resumo' })).toBe(false);
    expect(isSummarized(undefined)).toBe(false);
    expect(isSummarized(null)).toBe(false);
  });
});
