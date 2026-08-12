import { describe, expect, test } from 'bun:test';
import { summarize } from '../../engine/summary';
import { formatUninstallSummary } from './format-summary';

describe('formatUninstallSummary', () => {
  test('uses uninstall vocabulary for the four counts and lists each failure', () => {
    const summary = summarize([
      { status: 'installed', id: 'slack' },
      { status: 'already-installed', id: 'git' },
      { status: 'unsupported', id: 'xcode', reason: 'motivo' },
      { status: 'failed', id: 'docker', error: 'network unreachable' },
    ]);

    const text = formatUninstallSummary(summary);

    expect(text).toContain('desinstalados: 1');
    expect(text).toContain('não estavam instalados: 1');
    expect(text).toContain('não suportados: 1');
    expect(text).toContain('falharam: 1');
    expect(text).toContain('docker: network unreachable');
    expect(text).not.toContain('\n  instalados:');
    expect(text).not.toContain('\n  já instalados:');
  });

  test('never prints the install-style bare labels, even with zero counts', () => {
    const summary = summarize([]);

    const text = formatUninstallSummary(summary);

    expect(text).toContain('desinstalados: 0');
    expect(text).not.toContain('\n  instalados:');
    expect(text).not.toContain('\n  já instalados:');
  });
});
