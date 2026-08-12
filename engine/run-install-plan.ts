import type { Runner } from '../runner/runner';
import { createSudoSession, type SudoSession } from '../sudo/session';
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
  /** Injectable sudo session factory (issue #8) — tests supply a fake so no real process spawns. */
  readonly createSudoSession?: (runner: Runner) => SudoSession;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * True when at least one Tool in the plan resolves, on this Plataforma, to
 * a Recipe that declares `requiresPrivilege` (issue #8) — the `apt` and
 * `aptRepo` Helpers, so far. Reads the flag instead of inspecting command
 * strings, which would break the moment a new privileged Helper shows up.
 */
function planRequiresPrivilege(tools: readonly Tool[], platform: Platform): boolean {
  return tools.some((tool) => {
    const entry = resolveForPlatform(tool, platform);
    return !isUnsupported(entry) && entry.requiresPrivilege === true;
  });
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

  // Linux only (macOS Homebrew refuses to run as root — never sudo there),
  // and only when the plan actually touches a privileged Helper (issue #8).
  const sudoSession =
    platform === 'linux' && planRequiresPrivilege(ordered, platform)
      ? (options.createSudoSession ?? createSudoSession)(runner)
      : undefined;

  const onInterrupt = (): void => {
    sudoSession?.stop();
    process.exit(1);
  };

  if (sudoSession) {
    await sudoSession.start();
    process.once('SIGINT', onInterrupt);
    process.once('SIGTERM', onInterrupt);
  }

  try {
    for (const tool of ordered) {
      const outcome = await runOne(tool, runner, platform);
      outcomes.push(outcome);
      options.onOutcome?.(outcome);

      if (outcome.status === 'failed' && tool.stage === FATAL_STAGE) {
        break;
      }
    }
  } finally {
    if (sudoSession) {
      process.off('SIGINT', onInterrupt);
      process.off('SIGTERM', onInterrupt);
      sudoSession.stop();
    }
  }

  return outcomes;
}
