import { describe, expect, test } from 'bun:test';
import type { Outcome } from './outcome';
import { exitCodeForSummary, formatSummary, summarize } from './summary';

describe('summarize', () => {
  test('tallies the four counts and the detail of each failure', () => {
    const outcomes: Outcome[] = [
      { status: 'installed', id: 'slack' },
      { status: 'installed', id: 'mise' },
      { status: 'already-installed', id: 'git' },
      { status: 'unsupported', id: 'xcode', reason: 'ferramenta exclusiva da Apple' },
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

describe('exitCodeForSummary', () => {
  test('is non-zero when there is at least one failure', () => {
    const summary = summarize([{ status: 'failed', id: 'docker', error: 'boom' }]);

    expect(exitCodeForSummary(summary)).not.toBe(0);
  });

  test('is zero for a mix of success, already-installed and unsupported only', () => {
    const summary = summarize([
      { status: 'installed', id: 'slack' },
      { status: 'already-installed', id: 'git' },
      { status: 'unsupported', id: 'xcode', reason: 'motivo' },
    ]);

    expect(exitCodeForSummary(summary)).toBe(0);
  });
});

describe('formatSummary', () => {
  test('includes the four counts and lists each failure', () => {
    const summary = summarize([
      { status: 'installed', id: 'slack' },
      { status: 'failed', id: 'docker', error: 'network unreachable' },
    ]);

    const text = formatSummary(summary);

    expect(text).toContain('instalados: 1');
    expect(text).toContain('já instalados: 0');
    expect(text).toContain('não suportados: 0');
    expect(text).toContain('falharam: 1');
    expect(text).toContain('docker: network unreachable');
  });
});
