import { defineCommand } from 'citty';
import type { Outcome } from '../../engine/outcome';
import { sortByStage } from '../../engine/stage-order';
import { exitCodeForSummary, formatSummary, summarize } from '../../engine/summary';
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
 * Builds the read-only `doctor` command: runs `isInstalled()` for every
 * Tool in the Catálogo and reports installed / faltando / não suportado
 * (issue #9). Reuses `engine/summary.ts` for the final counts instead of
 * tallying its own — a missing Tool is reported through the shared
 * `failed` Outcome (with `error: 'faltando'`), which also makes the doctor
 * run exit non-zero when something is missing, same as a failed install.
 *
 * `doctor` only ever calls `entry.isInstalled(runner)`, which the Recipe
 * contract (`tool/recipe.ts`) guarantees never throws and never issues a
 * write — install()/uninstall() are never called here.
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
      console.log(formatSummary(summary));
    },
  });
}
