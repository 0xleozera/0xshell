import { describe, expect, test } from 'bun:test';
import { createMockReporter } from './mock-reporter';

describe('MockReporter', () => {
  test('records every call in order, including the opening of a Tool line', () => {
    const reporter = createMockReporter();

    reporter.intro('0xshell install');
    reporter.task('Installing neovim').succeed('neovim installed');
    reporter.outro('All set.');

    expect(reporter.reports).toEqual([
      { kind: 'intro', message: '0xshell install' },
      { kind: 'task', message: 'Installing neovim' },
      { kind: 'succeed', message: 'neovim installed' },
      { kind: 'outro', message: 'All set.' },
    ]);
  });

  test('records each ending of a Tool line under its own kind', () => {
    const reporter = createMockReporter();

    reporter.task('a').skip('xcode not supported on linux: reason');
    reporter.task('b').noop('neovim already installed, nothing to do');
    reporter.task('c').absent('neovim missing');
    reporter.task('d').fail('docker failed: curl failed');

    expect(reporter.messages('skip', 'noop', 'absent', 'fail')).toEqual([
      'xcode not supported on linux: reason',
      'neovim already installed, nothing to do',
      'neovim missing',
      'docker failed: curl failed',
    ]);
  });

  test('keeps a block together with its title, the way a plain log would read it', () => {
    const reporter = createMockReporter();

    reporter.block('Summary', '  installed: 2');

    expect(reporter.messages('block')).toEqual(['Summary:\n  installed: 2']);
  });

  test('output joins everything reported, for assertions that only care that it was said', () => {
    const reporter = createMockReporter();

    reporter.warn('Warning: takes everything it installed with it.');
    reporter.error('Unknown tool');

    expect(reporter.output).toBe('Warning: takes everything it installed with it.\nUnknown tool');
  });
});
