import type { Summary } from '../../engine/summary';

/**
 * Uninstall-flavored rendering of the shared `Summary` (issue #11, review
 * follow-up). `engine/summary.ts` — `summarize()`, its four counts and
 * `exitCodeForSummary()` — is untouched and shared with `install`; only the
 * words printed here differ, because `install`'s `formatSummary` says
 * "instalados: 12" and that reads as wrong after twelve Tools were removed.
 * `summary.installed` still means "the action ran and changed the machine"
 * and `summary.alreadyInstalled` still means "already at the target end
 * state" (see `run-install-plan.ts`) — this only picks the right label for
 * each in uninstall's direction.
 */
export function formatUninstallSummary(summary: Summary): string {
  const lines = [
    'Resumo:',
    `  desinstalados: ${summary.installed}`,
    `  não estavam instalados: ${summary.alreadyInstalled}`,
    `  não suportados: ${summary.unsupported}`,
    `  falharam: ${summary.failed}`,
  ];

  if (summary.failures.length > 0) {
    lines.push('Falhas:');
    for (const failure of summary.failures) {
      lines.push(`  ✗ ${failure.id}: ${failure.error}`);
    }
  }

  return lines.join('\n');
}
