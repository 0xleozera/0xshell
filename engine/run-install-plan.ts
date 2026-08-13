import type { Runner } from '../runner/runner';
import { createSudoSession, type SudoSession } from '../sudo/session';
import type { Tool } from '../tool/define-tool';
import type { Platform } from '../tool/platform';
import { resolveForPlatform } from '../tool/resolve-for-platform';
import { isUnsupported } from '../tool/unsupported';
import type { Outcome } from './outcome';
import { sortByStage, type StageDirection } from './stage-order';

const FATAL_STAGE = 0;

export type PlanAction = 'install' | 'uninstall';

export type RunInstallPlanOptions = {
  readonly direction?: StageDirection;
  /**
   * `'install'` (default) or `'uninstall'`. Reuses the same `Outcome`
   * statuses in both directions rather than adding new ones: `installed`
   * means "the action ran and changed the machine" (installed, or removed)
   * and `already-installed` means "the machine was already in the target
   * end-state" (already installed, or already not installed). The command
   * layer picks the right label for each — the engine and the shared
   * summary/exit-code logic don't need to know which direction ran.
   */
  readonly action?: PlanAction;
  /** Called once per Tool, in execution order, as soon as its Outcome is known. */
  readonly onOutcome?: (outcome: Outcome) => void;
  readonly createSudoSession?: (runner: Runner) => SudoSession;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * True when at least one Tool in the plan resolves, on this Platform, to
 * a Recipe that declares `requiresPrivilege` — the `apt` and `aptRepo`
 * Helpers, so far. Reads the flag instead of inspecting command strings,
 * which would break the moment a new privileged Helper shows up.
 */
function planRequiresPrivilege(tools: readonly Tool[], platform: Platform): boolean {
  return tools.some((tool) => {
    const entry = resolveForPlatform(tool, platform);
    return !isUnsupported(entry) && entry.requiresPrivilege === true;
  });
}

async function runOne(tool: Tool, runner: Runner, platform: Platform, action: PlanAction): Promise<Outcome> {
  const entry = resolveForPlatform(tool, platform);

  if (isUnsupported(entry)) {
    return { status: 'unsupported', id: tool.id, reason: entry.reason };
  }

  try {
    const isInstalled = await entry.isInstalled(runner);

    if (action === 'uninstall') {
      if (!isInstalled) {
        return { status: 'already-installed', id: tool.id };
      }
      await entry.uninstall(runner);
      return { status: 'installed', id: tool.id };
    }

    if (isInstalled) {
      return { status: 'already-installed', id: tool.id };
    }
    await entry.install(runner);
    return { status: 'installed', id: tool.id };
  } catch (error) {
    return { status: 'failed', id: tool.id, error: errorMessage(error) };
  }
}

/**
 * The install engine, shared with `uninstall` via `options.action`: orders
 * the given Tools by Stage and runs them one at a time — no parallelism,
 * since Homebrew serializes on its own lock anyway and interleaved output
 * would be unreadable. A failure in Stage 0 (the package manager) is fatal
 * and aborts the rest of the plan; a failure in any other Stage is collected
 * and execution continues, so a flaky network blip on one install doesn't
 * cost the other nineteen. `uninstall` reuses this same policy and passes
 * `direction: 'desc'` to tear down in the opposite order things were built.
 */
export async function runInstallPlan(
  tools: readonly Tool[],
  runner: Runner,
  platform: Platform,
  options: RunInstallPlanOptions = {},
): Promise<readonly Outcome[]> {
  const action = options.action ?? 'install';
  const ordered = sortByStage(tools, options.direction ?? 'asc');
  const outcomes: Outcome[] = [];

  // Linux only (macOS Homebrew refuses to run as root — never sudo there),
  // and only when the plan actually touches a privileged Helper.
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
      const outcome = await runOne(tool, runner, platform, action);
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
