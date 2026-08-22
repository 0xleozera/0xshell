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
    const task = reporter.task('Instalando neovim…');

    task.succeed('neovim instalado');
    reporter.task('x').skip('xcode não suportado em linux: ferramenta exclusiva da Apple');
    reporter.task('x').noop('neovim já instalado, nada a fazer');
    reporter.task('x').absent('neovim faltando');

    expect(out).toEqual([
      '✓ neovim instalado',
      '⊘ xcode não suportado em linux: ferramenta exclusiva da Apple',
      '= neovim já instalado, nada a fazer',
      '✗ neovim faltando',
    ]);
  });

  test('prints nothing when a task opens — progress is a terminal affordance', () => {
    const { out, err, reporter } = capture();

    reporter.task('Instalando neovim…');

    expect(out).toEqual([]);
    expect(err).toEqual([]);
  });

  test('drops intro and outro, which carry no information', () => {
    const { out, err, reporter } = capture();

    reporter.intro('0xshell install');
    reporter.outro('Concluído');

    expect(out).toEqual([]);
    expect(err).toEqual([]);
  });

  test('keeps failures and errors on stderr, and everything else on stdout', () => {
    const { out, err, reporter } = capture();

    reporter.task('x').fail('docker falhou: curl falhou');
    reporter.error('0xshell uninstall requer um Tool nomeado');
    reporter.warn('Aviso: desinstalar o Homebrew leva junto tudo que ele instalou.');
    reporter.info('nota');
    reporter.line('neovim [stage 2]');

    expect(err).toEqual(['✗ docker falhou: curl falhou', '0xshell uninstall requer um Tool nomeado']);
    expect(out).toEqual([
      'Aviso: desinstalar o Homebrew leva junto tudo que ele instalou.',
      'nota',
      'neovim [stage 2]',
    ]);
  });

  test('renders a block as its title followed by the body', () => {
    const { out, reporter } = capture();

    reporter.block('Resumo', '  instalados: 2\n  falharam: 0');

    expect(out).toEqual(['Resumo:\n  instalados: 2\n  falharam: 0']);
  });
});
