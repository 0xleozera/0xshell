import type { CliContext } from '../lib/context';
import type { Outcome } from '../lib/outcome';
import type { Platform } from '../lib/platform';
import type { ReporterTask } from '../lib/reporter';
import { sortByStage } from '../lib/stage-order';
import { summarize, SUMMARY_TITLE, type Summary } from '../lib/summary';
import { isUnsupported, resolveForPlatform, type Tool } from '../lib/tool';
import type { Runner } from '../lib/runner';
import type { DoctorInput } from '../schemas/commands';

export type DoctorResult = {
  readonly summary: Summary;
  readonly outcomes: readonly Outcome[];
};

function reportOutcome(task: ReporterTask, outcome: Outcome, platform: Platform): void {
  if (outcome.status === 'installed') {
    return task.succeed(`${outcome.id} instalado`);
  }

  if (outcome.status === 'unsupported') {
    return task.skip(`${outcome.id} não suportado em ${platform}: ${outcome.reason}`);
  }

  if (outcome.status === 'failed') {
    // Reported as absent, not as a failure: the check itself succeeded,
    // it just found the Tool missing.
    return task.absent(`${outcome.id} faltando`);
  }

  // doctor never produces `already-installed` — isInstalled() only tells
  // apart installed from missing, not "just installed" from "already there".
}

/**
 * doctor's own presentation of the tally — deliberately not install's. A
 * missing Tool is counted through the shared `failed` Outcome so
 * `summarize()` can be reused without a new status, but a missing Tool is
 * not a failure of the `doctor` command: the check itself always succeeds,
 * it is just reporting what it found. So the count is labelled as missing,
 * and no failures header is printed — install's vocabulary there would read
 * as something having gone wrong. `alreadyInstalled` is never printed:
 * `doctor` never produces that Outcome, so it is always zero and would say
 * nothing.
 */
export function formatDoctorSummary(summary: Summary): string {
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

async function check(tool: Tool, runner: Runner, platform: Platform): Promise<Outcome> {
  const entry = resolveForPlatform(tool, platform);

  if (isUnsupported(entry)) {
    return { status: 'unsupported', id: tool.id, reason: entry.reason };
  }

  return (await entry.isInstalled(runner))
    ? { status: 'installed', id: tool.id }
    : { status: 'failed', id: tool.id, error: 'faltando' };
}

/**
 * Runs `isInstalled()` for every Tool in the Catalog and reports each one as
 * installed, missing or unsupported. Never writes: the Recipe contract
 * (`lib/recipe.ts`) guarantees `isInstalled()` issues no write and never
 * throws, and install()/uninstall() are never called here.
 *
 * The exit code is a deliberate choice, not a side effect of the shared
 * summary: it is non-zero whenever at least one Tool is missing, so
 * `0xshell doctor && …` can gate a script on the machine being fully set up.
 * The direct consequence: on a brand-new machine, where most of the Catalog
 * is still missing, `doctor` exits non-zero — that is the expected result of
 * an audit that found things to install, not an error.
 */
export async function doctorCommand(_input: DoctorInput, ctx: CliContext): Promise<DoctorResult> {
  const { reporter, runner, platform } = ctx;
  const tools = sortByStage(ctx.catalog);
  const outcomes: Outcome[] = [];

  reporter.intro('0xshell doctor');

  for (const tool of tools) {
    const line = reporter.task(`Verificando ${tool.id}`);
    const outcome = await check(tool, runner, platform);

    outcomes.push(outcome);
    reportOutcome(line, outcome, platform);
  }

  const summary = summarize(outcomes);
  reporter.block(SUMMARY_TITLE, formatDoctorSummary(summary));
  reporter.outro(closingMessage(summary));

  return { summary, outcomes };
}
