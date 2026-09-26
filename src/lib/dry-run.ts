import { homedir } from 'node:os';
import { planConfiguration } from './configuration';
import { displayPath } from './display-path';
import type { PlanAction } from './install-plan';
import type { Platform } from './platform';
import { createRecordingRunner } from './recording-runner';
import type { Recipe } from './recipe';
import type { Command, Runner } from './runner';
import { sortByStage, type StageDirection } from './stage-order';
import { isUnsupported, resolveForPlatform, type Tool } from './tool';

/** What a real run would do to one Tool, before anything is done to it. */
export type DryRunEntry =
  | { readonly status: 'unsupported'; readonly id: string; readonly reason: string }
  | { readonly status: 'nothing-to-do'; readonly id: string }
  | {
      readonly status: 'planned';
      readonly id: string;
      readonly commands: readonly Command[];
      /** Absolute paths `install` would (re)write for the Tool's Configuration. */
      readonly writes: readonly string[];
    };

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
  install: (id) => `= ${id} already installed, nothing to do`,
  uninstall: (id) => `= ${id} not installed, nothing to do`,
};

async function record(entry: Recipe, action: PlanAction): Promise<readonly Command[]> {
  const recorder = createRecordingRunner();
  await (action === 'install' ? entry.install(recorder) : entry.uninstall(recorder));
  return recorder.commands;
}

// Same read-only check `install` runs before writing, so a Configuration
// that already matches the machine plans no write.
async function configurationWrites(tool: Tool, runner: Runner, action: PlanAction): Promise<readonly string[]> {
  if (action === 'uninstall' || !tool.configuration) return [];

  const { writes } = await planConfiguration(tool.configuration, runner);
  return writes.map((file) => file.path);
}

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
 *
 * On `install`, a Tool's Configuration is planned the same way: the files
 * that differ from the machine are listed as writes, even for a Tool that is
 * already installed.
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

    const inEndState = (await entry.isInstalled(runner)) === (action === 'install');
    const writes = await configurationWrites(tool, runner, action);

    if (inEndState && writes.length === 0) {
      plan.push({ status: 'nothing-to-do', id: tool.id });
      continue;
    }

    const commands = inEndState ? [] : await record(entry, action);
    plan.push({ status: 'planned', id: tool.id, commands, writes });
  }

  return plan;
}

/**
 * Renders the plan for the Reporter, one entry per line. A dry run is a
 * plan, not progress: the lines carry their own marker instead of being
 * opened and closed as Tool lines, and a Tool whose action issues no
 * command at all contributes no line.
 *
 * A planned Tool prints all of its commands, then the files its
 * Configuration would write (`✎`), in a single entry: a Reporter
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
      return [`⊘ ${entry.id} not supported on ${platform}: ${entry.reason}`];
    }

    if (entry.status === 'nothing-to-do') {
      return [NOTHING_TO_DO[action](entry.id)];
    }

    const lines = [
      ...entry.commands.map((command) => `→ ${entry.id}: ${command.join(' ')}`),
      ...entry.writes.map((path) => `✎ ${entry.id}: writes ${displayPath(path, homedir())}`),
    ];

    return lines.length === 0 ? [] : [lines.join('\n')];
  });
}
