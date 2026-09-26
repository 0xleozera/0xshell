import { describe, expect, test } from 'bun:test';
import { CliError, exitCodeFor, exitCodeForResult, messageFor } from './errors';
import { summarize } from './summary';

describe('exitCodeFor', () => {
  test('gives a wrong invocation the shell code for wrong usage', () => {
    expect(exitCodeFor(new CliError('usage', 'faltou o Tool'))).toBe(2);
  });

  test('gives a cancelled run 130, what a shell expects back from a Ctrl+C', () => {
    expect(exitCodeFor(new CliError('cancelled', 'cancelado'))).toBe(130);
  });

  test('gives a run that legitimately could not do its job 1', () => {
    expect(exitCodeFor(new CliError('failed', 'failed'))).toBe(1);
  });

  test('gives an unexpected error 1', () => {
    expect(exitCodeFor(new Error('boom'))).toBe(1);
    expect(exitCodeFor('boom')).toBe(1);
  });
});

describe('exitCodeForResult', () => {
  test('is non-zero when the run collected at least one failure', () => {
    const summary = summarize([{ status: 'failed', id: 'docker', error: 'boom' }]);

    expect(exitCodeForResult({ summary })).not.toBe(0);
  });

  test('is zero for a mix of success, already-installed and unsupported only', () => {
    const summary = summarize([
      { status: 'installed', id: 'slack' },
      { status: 'already-installed', id: 'git' },
      { status: 'unsupported', id: 'xcode', reason: 'reason' },
    ]);

    expect(exitCodeForResult({ summary })).toBe(0);
  });

  test('is zero for a result that has no Summary at all', () => {
    expect(exitCodeForResult({ dryRun: true, plan: [] })).toBe(0);
    expect(exitCodeForResult(undefined)).toBe(0);
  });
});

describe('messageFor', () => {
  test('reads the message off an Error, never the stack', () => {
    expect(messageFor(new CliError('usage', 'faltou o Tool'))).toBe('faltou o Tool');
  });

  test('falls back to the value itself when it is not an Error', () => {
    expect(messageFor('boom')).toBe('boom');
  });
});
