import type { PlanAction } from './install-plan';
import type { Platform } from './platform';
import { createRecordingRunner } from './recording-runner';
import type { Command, Runner } from './runner';
import { sortByStage, type StageDirection } from './stage-order';
import { isUnsupported, resolveForPlatform, type Tool } from './tool';

/** What a real run would do to one Tool, before anything is done to it. */
export type DryRunEntry =
  | { readonly status: 'unsupported'; readonly id: string; readonly reason: string }
  | { readonly status: 'nothing-to-do'; readonly id: string }
  | { readonly status: 'planned'; readonly id: string; readonly commands: readonly Command[] };

const DIRECTION: Record<PlanAction, StageDirection> = {
  install: 'asc',
  uninstall: 'desc',
};

/**
 * The wording of "there is nothing to do here" is the one line a dry run
 * cannot share between the two directions: the same machine state reads as
 * "already installed" to `install` and as "not installed" to `uninstall`.
 */
const NOTHING_TO_DO: Record<PlanAction, (id: string) => string> = {
  install: (id) => `= ${id} já instalado, nada a fazer`,
  uninstall: (id) => `= ${id} não instalado, nada a fazer`,
};

/**
 * Computes exactly what `install`/`uninstall` would do for each Tool, in
 * the Stage order that run would use, without ever sending an
 * install/uninstall command to the real Runner.
 *
 * `isInstalled()` is a read, so it deliberately does run against the real
 * `runner` — that's the useful half of "what would happen": it's how a dry
 * run tells "would install" apart from "already installed" instead of
 * blindly listing every Tool as pending. The action itself runs against a
 * throwaway `RecordingRunner`, purely to surface the exact commands it
 * would issue; the real `runner` never sees them.
 */
export async function buildDryRunPlan(
  tools: readonly Tool[],
  runner: Runner,
  platform: Platform,
  action: PlanAction,
): Promise<readonly DryRunEntry[]> {
  const ordered = sortByStage(tools, DIRECTION[action]);
  const plan: DryRunEntry[] = [];

  for (const tool of ordered) {
    const entry = resolveForPlatform(tool, platform);

    if (isUnsupported(entry)) {
      plan.push({ status: 'unsupported', id: tool.id, reason: entry.reason });
      continue;
    }

    const isInstalled = await entry.isInstalled(runner);
    if (isInstalled === (action === 'install')) {
      plan.push({ status: 'nothing-to-do', id: tool.id });
      continue;
    }

    const recorder = createRecordingRunner();
    await (action === 'install' ? entry.install(recorder) : entry.uninstall(recorder));
    plan.push({ status: 'planned', id: tool.id, commands: recorder.commands });
  }

  return plan;
}

/**
 * Renders the plan for the Reporter, one entry per line. A dry run is a
 * plan, not progress: the lines carry their own marker instead of being
 * opened and closed as Tool lines, and a Tool whose action issues no
 * command at all contributes no line.
 *
 * A planned Tool prints all of its commands in a single entry: a Reporter
 * may set consecutive lines apart, and the commands of one Tool belong
 * together. The text is the same, one command per line, either way.
 */
export function formatDryRunPlan(
  plan: readonly DryRunEntry[],
  platform: Platform,
  action: PlanAction,
): readonly string[] {
  return plan.flatMap((entry) => {
    if (entry.status === 'unsupported') {
      return [`⊘ ${entry.id} não suportado em ${platform}: ${entry.reason}`];
    }

    if (entry.status === 'nothing-to-do') {
      return [NOTHING_TO_DO[action](entry.id)];
    }

    if (entry.commands.length === 0) {
      return [];
    }

    return [entry.commands.map((command) => `→ ${entry.id}: ${command.join(' ')}`).join('\n')];
  });
}
