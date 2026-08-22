import { defineCommand } from 'citty';
import type { Outcome } from '../../engine/outcome';
import { sortByStage } from '../../engine/stage-order';
import { exitCodeForSummary, summarize, SUMMARY_TITLE, type Summary } from '../../engine/summary';
import { createPlainReporter } from '../../reporter/plain-reporter';
import type { Reporter, ReporterTask } from '../../reporter/reporter';
import type { Runner } from '../../runner/runner';
import type { Tool } from '../../tool/define-tool';
import type { Platform } from '../../tool/platform';
import { resolveForPlatform } from '../../tool/resolve-for-platform';
import { isUnsupported } from '../../tool/unsupported';
import { catalog } from '../install/catalog';

function reportOutcome(task: ReporterTask, outcome: Outcome, platform: Platform): void {
  switch (outcome.status) {
    case 'installed':
      task.succeed(`${outcome.id} instalado`);
      break;
    case 'failed':
      // Reported as absent, not as a failure: the check itself succeeded,
      // it just found the Tool missing.
      task.absent(`${outcome.id} faltando`);
      break;
    case 'unsupported':
      task.skip(`${outcome.id} não suportado em ${platform}: ${outcome.reason}`);
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
 * status, but a missing Tool is not a failure of the `doctor` command: the
 * check itself always succeeds, it's just reporting what it found. So the
 * count is labelled as missing, not as failed, and no failures header is
 * printed — install's vocabulary there would read as something having gone
 * wrong. `alreadyInstalled` is never printed:
 * `doctor` never produces that Outcome (see `reportOutcome`), so it is
 * always zero and would say nothing.
 */
function formatDoctorSummary(summary: Summary): string {
  return [
    `  instalados: ${summary.installed}`,
    `  faltando: ${summary.failed}`,
    `  não suportados: ${summary.unsupported}`,
  ].join('\n');
}

function closingMessage(summary: Summary): string {
  if (summary.failed === 0) {
    return 'Máquina em dia.';
  }

  return summary.failed === 1
    ? 'Falta 1 ferramenta — rode 0xshell install.'
    : `Faltam ${summary.failed} ferramentas — rode 0xshell install.`;
}

export type DoctorCommandOptions = {
  readonly lookupCatalog?: () => readonly Tool[];
  readonly reporter?: Reporter;
};

/**
 * Builds the read-only `doctor` command: runs `isInstalled()` for every
 * Tool in the Catalog and reports each one as installed, missing or
 * unsupported. Reuses `summarize()` from `engine/summary.ts` to tally the
 * counts — not `formatSummary`, see `formatDoctorSummary` above for why.
 *
 * `doctor` only ever calls `entry.isInstalled(runner)`, which the Recipe
 * contract (`tool/recipe.ts`) guarantees never throws and never issues a
 * write — install()/uninstall() are never called here.
 *
 * Exit code is a deliberate choice, not a side effect of reusing
 * `exitCodeForSummary`: it is non-zero whenever at least one Tool is
 * missing, so `0xshell doctor && …` can gate a script on the machine being
 * fully set up. The direct consequence: on a brand-new machine, where most
 * of the Catalog is still missing, `doctor` exits non-zero — that is the
 * expected result of an audit that found things to install, not an error.
 */
export function createDoctorCommand(runner: Runner, platform: Platform, options: DoctorCommandOptions = {}) {
  const { lookupCatalog = () => catalog, reporter = createPlainReporter() } = options;

  return defineCommand({
    meta: {
      name: 'doctor',
      description: 'Verifica o que está instalado, faltando ou não suportado, sem escrever nada',
    },
    async run() {
      const tools = sortByStage(lookupCatalog());
      const outcomes: Outcome[] = [];

      reporter.intro('0xshell doctor');

      for (const tool of tools) {
        const line = reporter.task(`Verificando ${tool.id}`);
        const entry = resolveForPlatform(tool, platform);
        const outcome: Outcome = isUnsupported(entry)
          ? { status: 'unsupported', id: tool.id, reason: entry.reason }
          : (await entry.isInstalled(runner))
            ? { status: 'installed', id: tool.id }
            : { status: 'failed', id: tool.id, error: 'faltando' };

        outcomes.push(outcome);
        reportOutcome(line, outcome, platform);
      }

      const summary = summarize(outcomes);
      process.exitCode = exitCodeForSummary(summary);
      reporter.block(SUMMARY_TITLE, formatDoctorSummary(summary));
      reporter.outro(closingMessage(summary));
    },
  });
}
