import type { Backup } from './backup';
import { applyConfiguration, type Configuration, type ConfigureResult } from './configuration';
import type { Outcome } from './outcome';
import type { Platform } from './platform';
import type { Runner } from './runner';
import { sortByStage, type StageDirection } from './stage-order';
import { createSudoSession, type SudoSession } from './sudo-session';
import { isUnsupported, resolveForPlatform, type Tool } from './tool';

const FATAL_STAGE = 0;

export type PlanAction = 'install' | 'uninstall';

/** `uninstall` tears down in the opposite order things were built. */
const DIRECTION_BY_ACTION: Record<PlanAction, StageDirection> = {
  install: 'asc',
  uninstall: 'desc',
};

export type RunInstallPlanOptions = {
  /** Defaults to the direction the action implies — `desc` for uninstall. */
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
  /**
   * Called once per Tool, in execution order, just *before* its command
   * runs. Always paired with `onOutcome`, which closes the same line.
   */
  readonly onToolStart?: (tool: Tool) => void;
  /** Called once per Tool, in execution order, as soon as its Outcome is known. */
  readonly onOutcome?: (outcome: Outcome) => void;
  /** Where the sudo session's password warning goes; defaults to the session's own. */
  readonly onWarning?: (message: string) => void;
  readonly createSudoSession?: (runner: Runner) => SudoSession;
  /**
   * Where `install` keeps what a Configuration replaces. Required as soon as
   * the plan configures a Tool; `uninstall` never needs one.
   */
  readonly backup?: Backup;
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

async function runOne(
  tool: Tool,
  runner: Runner,
  platform: Platform,
  action: PlanAction,
  backup: Backup | undefined,
): Promise<Outcome> {
  const entry = resolveForPlatform(tool, platform);

  if (isUnsupported(entry)) {
    return { status: 'unsupported', id: tool.id, reason: entry.reason };
  }

  try {
    const isInstalled = await entry.isInstalled(runner);

    // The machine is already in the end state this action aims at.
    const status = isInstalled === (action === 'install') ? 'already-installed' : 'installed';

    if (status === 'installed') {
      await (action === 'install' ? entry.install(runner) : entry.uninstall(runner));
    }

    // An already-installed Tool is configured too: on a machine that came
    // with zsh, the Configuration is the only thing install has to add.
    if (action === 'uninstall' || !tool.configuration) {
      return { status, id: tool.id };
    }

    return { status, id: tool.id, configuration: await configure(tool.configuration, runner, backup) };
  } catch (error) {
    return { status: 'failed', id: tool.id, error: errorMessage(error) };
  }
}

// Prefixed so a failure reads apart from a failed install in the summary:
// the Tool is on the machine, only its files are not.
async function configure(
  configuration: Configuration,
  runner: Runner,
  backup: Backup | undefined,
): Promise<ConfigureResult> {
  try {
    if (!backup) throw new Error('nenhum backup para guardar os arquivos substituídos');
    return await applyConfiguration(configuration, runner, backup);
  } catch (error) {
    throw new Error(`configuração falhou: ${errorMessage(error)}`);
  }
}

/**
 * The install engine, shared with `uninstall` via `options.action`: orders
 * the given Tools by Stage and runs them one at a time — no parallelism,
 * since Homebrew serializes on its own lock anyway and interleaved output
 * would be unreadable. A failure in Stage 0 (the package manager) is fatal
 * and aborts the rest of the plan; a failure in any other Stage is collected
 * and execution continues, so a flaky network blip on one install doesn't
 * cost the other nineteen.
 *
 * On `install`, a Tool with a Configuration is configured right after it is
 * installed (or found installed), before the next Tool starts — so a later
 * Tool can rely on an earlier one's files being in place (ADR-0006).
 */
export async function runInstallPlan(
  tools: readonly Tool[],
  runner: Runner,
  platform: Platform,
  options: RunInstallPlanOptions = {},
): Promise<readonly Outcome[]> {
  const action = options.action ?? 'install';
  const ordered = sortByStage(tools, options.direction ?? DIRECTION_BY_ACTION[action]);
  const outcomes: Outcome[] = [];

  // Linux only (macOS Homebrew refuses to run as root — never sudo there),
  // and only when the plan actually touches a privileged Helper.
  const sudoSession =
    platform === 'linux' && planRequiresPrivilege(ordered, platform)
      ? (options.createSudoSession ?? ((r: Runner) => createSudoSession(r, { warn: options.onWarning })))(runner)
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
      options.onToolStart?.(tool);
      const outcome = await runOne(tool, runner, platform, action, options.backup);
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
