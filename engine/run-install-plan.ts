import type { Runner } from '../runner/runner';
import type { Tool } from '../tool/define-tool';
import type { Platform } from '../tool/platform';
import { resolveForPlatform } from '../tool/resolve-for-platform';
import { isUnsupported } from '../tool/unsupported';
import type { Outcome } from './outcome';
import { sortByStage, type StageDirection } from './stage-order';

const FATAL_STAGE = 0;

export type RunInstallPlanOptions = {
  readonly direction?: StageDirection;
  /** Called once per Tool, in execution order, as soon as its Outcome is known. */
  readonly onOutcome?: (outcome: Outcome) => void;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runOne(tool: Tool, runner: Runner, platform: Platform): Promise<Outcome> {
  const entry = resolveForPlatform(tool, platform);

  if (isUnsupported(entry)) {
    return { status: 'unsupported', id: tool.id, reason: entry.reason };
  }

  try {
    const alreadyInstalled = await entry.isInstalled(runner);
    if (alreadyInstalled) {
      return { status: 'already-installed', id: tool.id };
    }

    await entry.install(runner);
    return { status: 'installed', id: tool.id };
  } catch (error) {
    return { status: 'failed', id: tool.id, error: errorMessage(error) };
  }
}

/**
 * The install engine (issue #4): orders the given Tools by Stage and runs
 * them one at a time — no parallelism, since Homebrew serializes on its own
 * lock anyway and interleaved output would be unreadable. A failure in
 * Stage 0 (the package manager) is fatal and aborts the rest of the plan;
 * a failure in any other Stage is collected and execution continues, so a
 * flaky network blip on install #3 doesn't cost the other nineteen.
 *
 * Testable without citty — the command layer just formats what this returns.
 */
export async function runInstallPlan(
  tools: readonly Tool[],
  runner: Runner,
  platform: Platform,
  options: RunInstallPlanOptions = {},
): Promise<readonly Outcome[]> {
  const ordered = sortByStage(tools, options.direction ?? 'asc');
  const outcomes: Outcome[] = [];

  // Ponto de extensão futuro (#8): solicitar sudo aqui, uma única vez, antes do loop.

  for (const tool of ordered) {
    const outcome = await runOne(tool, runner, platform);
    outcomes.push(outcome);
    options.onOutcome?.(outcome);

    if (outcome.status === 'failed' && tool.stage === FATAL_STAGE) {
      break;
    }
  }

  return outcomes;
}
