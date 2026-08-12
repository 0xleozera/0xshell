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

/** Tallies the four counts (issue #4) reused by install, doctor and uninstall. */
export function summarize(outcomes: readonly Outcome[]): Summary {
  let installed = 0;
  let alreadyInstalled = 0;
  let unsupported = 0;
  const failures: Failure[] = [];

  for (const outcome of outcomes) {
    switch (outcome.status) {
      case 'installed':
        installed++;
        break;
      case 'already-installed':
        alreadyInstalled++;
        break;
      case 'unsupported':
        unsupported++;
        break;
      case 'failed':
        failures.push({ id: outcome.id, error: outcome.error });
        break;
    }
  }

  return { installed, alreadyInstalled, unsupported, failed: failures.length, failures };
}

/** Non-zero when at least one Tool failed, so the command can be chained in a script. */
export function exitCodeForSummary(summary: Summary): number {
  return summary.failed > 0 ? 1 : 0;
}

export function formatSummary(summary: Summary): string {
  const lines = [
    'Resumo:',
    `  instalados: ${summary.installed}`,
    `  já instalados: ${summary.alreadyInstalled}`,
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
