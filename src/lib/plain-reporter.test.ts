import { describe, expect, test } from 'bun:test';
import { createPlainReporter } from './plain-reporter';

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, reporter: createPlainReporter({ out: (m) => out.push(m), err: (m) => err.push(m) }) };
}

describe('plain reporter', () => {
  test('marks each ending of a Tool line with its own glyph', () => {
    const { out, reporter } = capture();
    const task = reporter.task('Installing neovim…');

    task.succeed('neovim installed');
    reporter.task('x').skip('xcode not supported on linux: Apple-only tool');
    reporter.task('x').noop('neovim already installed, nothing to do');
    reporter.task('x').absent('neovim missing');

    expect(out).toEqual([
      '✓ neovim installed',
      '⊘ xcode not supported on linux: Apple-only tool',
      '= neovim already installed, nothing to do',
      '✗ neovim missing',
    ]);
  });

  test('prints nothing when a task opens — progress is a terminal affordance', () => {
    const { out, err, reporter } = capture();

    reporter.task('Installing neovim…');

    expect(out).toEqual([]);
    expect(err).toEqual([]);
  });

  test('drops intro and outro, which carry no information', () => {
    const { out, err, reporter } = capture();

    reporter.intro('0xshell install');
    reporter.outro('Done');

    expect(out).toEqual([]);
    expect(err).toEqual([]);
  });

  test('keeps failures and errors on stderr, and everything else on stdout', () => {
    const { out, err, reporter } = capture();

    reporter.task('x').fail('docker failed: curl failed');
    reporter.error('0xshell uninstall requires a named Tool');
    reporter.warn('Warning: uninstalling Homebrew takes everything it installed with it.');
    reporter.info('nota');
    reporter.line('neovim [stage 2]');

    expect(err).toEqual(['✗ docker failed: curl failed', '0xshell uninstall requires a named Tool']);
    expect(out).toEqual([
      'Warning: uninstalling Homebrew takes everything it installed with it.',
      'nota',
      'neovim [stage 2]',
    ]);
  });

  test('renders a block as its title followed by the body', () => {
    const { out, reporter } = capture();

    reporter.block('Summary', '  installed: 2\n  failed: 0');

    expect(out).toEqual(['Summary:\n  installed: 2\n  failed: 0']);
  });
});
