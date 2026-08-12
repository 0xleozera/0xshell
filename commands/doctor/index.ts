import { defineCommand } from 'citty';
import type { Outcome } from '../../engine/outcome';
import { sortByStage } from '../../engine/stage-order';
import { exitCodeForSummary, summarize, type Summary } from '../../engine/summary';
import type { Runner } from '../../runner/runner';
import type { Tool } from '../../tool/define-tool';
import type { Platform } from '../../tool/platform';
import { resolveForPlatform } from '../../tool/resolve-for-platform';
import { isUnsupported } from '../../tool/unsupported';
import { catalog } from '../install/catalog';

function reportOutcome(outcome: Outcome, platform: Platform): void {
  switch (outcome.status) {
    case 'installed':
      console.log(`✓ ${outcome.id} instalado`);
      break;
    case 'failed':
      console.log(`✗ ${outcome.id} faltando`);
      break;
    case 'unsupported':
      console.log(`⊘ ${outcome.id} não suportado em ${platform}: ${outcome.reason}`);
      break;
    case 'already-installed':
      // doctor never produces this status — isInstalled() only tells apart
      // installed from missing, not "just installed" from "already there".
      break;
  }
}

/**
 * doctor's own presentation of the tally — deliberately not `formatSummary`
 * (install's shared formatter). A missing Tool is counted through the
 * shared `failed` Outcome so `summarize()` can be reused without a new
 * status, but "faltando" is not a failure of the `doctor` command: the
 * check itself always succeeds, it's just reporting what it found. Printing
 * it as "falharam" under a "Falhas:" header — install's vocabulary — would
 * read as something having gone wrong. `alreadyInstalled` is never printed:
 * `doctor` never produces that Outcome (see `reportOutcome`), so it is
 * always zero and would say nothing.
 */
function formatDoctorSummary(summary: Summary): string {
  return [
    'Resumo:',
    `  instalados: ${summary.installed}`,
    `  faltando: ${summary.failed}`,
    `  não suportados: ${summary.unsupported}`,
  ].join('\n');
}

/**
 * Builds the read-only `doctor` command: runs `isInstalled()` for every
 * Tool in the Catálogo and reports installed / faltando / não suportado
 * (issue #9). Reuses `summarize()` from `engine/summary.ts` to tally the
 * counts — not `formatSummary`, see `formatDoctorSummary` above for why.
 *
 * `doctor` only ever calls `entry.isInstalled(runner)`, which the Recipe
 * contract (`tool/recipe.ts`) guarantees never throws and never issues a
 * write — install()/uninstall() are never called here.
 *
 * Exit code is a deliberate choice, not a side effect of reusing
 * `exitCodeForSummary`: it is non-zero whenever at least one Tool is
 * missing, so `sshell doctor && …` can gate a script on the machine being
 * fully set up. The direct consequence: on a brand-new machine, where most
 * of the Catálogo is still missing, `doctor` exits non-zero — that is the
 * expected result of an audit that found things to install, not an error.
 *
 * `lookupCatalog` defaults to the real Catálogo but is injectable so tests
 * run against a fixture instead of the real, growing Catálogo (see #10).
 */
export function createDoctorCommand(
  runner: Runner,
  platform: Platform,
  lookupCatalog: () => readonly Tool[] = () => catalog,
) {
  return defineCommand({
    meta: {
      name: 'doctor',
      description: 'Verifica o que está instalado, faltando ou não suportado, sem escrever nada',
    },
    async run() {
      const tools = sortByStage(lookupCatalog());
      const outcomes: Outcome[] = [];

      for (const tool of tools) {
        const entry = resolveForPlatform(tool, platform);
        const outcome: Outcome = isUnsupported(entry)
          ? { status: 'unsupported', id: tool.id, reason: entry.reason }
          : (await entry.isInstalled(runner))
            ? { status: 'installed', id: tool.id }
            : { status: 'failed', id: tool.id, error: 'faltando' };

        outcomes.push(outcome);
        reportOutcome(outcome, platform);
      }

      const summary = summarize(outcomes);
      process.exitCode = exitCodeForSummary(summary);
      console.log(formatDoctorSummary(summary));
    },
  });
}
