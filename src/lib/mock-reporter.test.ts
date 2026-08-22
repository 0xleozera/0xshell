import { describe, expect, test } from 'bun:test';
import { createMockReporter } from './mock-reporter';

describe('MockReporter', () => {
  test('records every call in order, including the opening of a Tool line', () => {
    const reporter = createMockReporter();

    reporter.intro('0xshell install');
    reporter.task('Instalando neovim').succeed('neovim instalado');
    reporter.outro('Tudo pronto.');

    expect(reporter.reports).toEqual([
      { kind: 'intro', message: '0xshell install' },
      { kind: 'task', message: 'Instalando neovim' },
      { kind: 'succeed', message: 'neovim instalado' },
      { kind: 'outro', message: 'Tudo pronto.' },
    ]);
  });

  test('records each ending of a Tool line under its own kind', () => {
    const reporter = createMockReporter();

    reporter.task('a').skip('xcode não suportado em linux: motivo');
    reporter.task('b').noop('neovim já instalado, nada a fazer');
    reporter.task('c').absent('neovim faltando');
    reporter.task('d').fail('docker falhou: curl falhou');

    expect(reporter.messages('skip', 'noop', 'absent', 'fail')).toEqual([
      'xcode não suportado em linux: motivo',
      'neovim já instalado, nada a fazer',
      'neovim faltando',
      'docker falhou: curl falhou',
    ]);
  });

  test('keeps a block together with its title, the way a plain log would read it', () => {
    const reporter = createMockReporter();

    reporter.block('Resumo', '  instalados: 2');

    expect(reporter.messages('block')).toEqual(['Resumo:\n  instalados: 2']);
  });

  test('output joins everything reported, for assertions that only care that it was said', () => {
    const reporter = createMockReporter();

    reporter.warn('Aviso: leva junto tudo que ele instalou.');
    reporter.error('Ferramenta desconhecida');

    expect(reporter.output).toBe('Aviso: leva junto tudo que ele instalou.\nFerramenta desconhecida');
  });
});
