import type { CliContext } from '../lib/context';
import { buildDryRunPlan, formatDryRunPlan, type DryRunEntry } from '../lib/dry-run';
import { CliError } from '../lib/errors';
import { runInstallPlan } from '../lib/install-plan';
import type { Outcome } from '../lib/outcome';
import type { Platform } from '../lib/platform';
import type { ReporterTask } from '../lib/reporter';
import { selectTools } from '../lib/select-tools';
import { formatFailures, summarize, SUMMARY_TITLE, type Summary } from '../lib/summary';
import type { Tool } from '../lib/tool';
import type { UninstallInput } from '../schemas/commands';

export type UninstallResult =
  | { readonly dryRun: true; readonly plan: readonly DryRunEntry[] }
  | { readonly dryRun: false; readonly summary: Summary; readonly outcomes: readonly Outcome[] }
  /** `--all` was declined: nothing was selected, nothing ran. */
  | { readonly dryRun: false; readonly confirmed: false };

/**
 * Stage 0 (homebrew) and Stage 1 (mise) — the guarded Stages, only ever
 * removed when named explicitly. Checked by `stage`, not by id, so the rule
 * stays correct for whichever Tool ends up there.
 */
const GUARDED_STAGES = new Set([0, 1]);

const GUARDED_STAGE_WARNINGS: Record<number, string> = {
  0: 'Warning: uninstalling Homebrew (Stage 0) takes everything it installed with it.',
  1: 'Warning: uninstalling mise (Stage 1) takes bun, pnpm, yarn, go, node and neovim with it.',
};

function reportOutcome(task: ReporterTask, outcome: Outcome, platform: Platform): void {
  if (outcome.status === 'installed') {
    return task.succeed(`${outcome.id} uninstalled`);
  }

  if (outcome.status === 'already-installed') {
    return task.succeed(`${outcome.id} was not installed`);
  }

  if (outcome.status === 'unsupported') {
    return task.skip(`${outcome.id} not supported on ${platform}: ${outcome.reason}`);
  }

  task.fail(`${outcome.id} failed: ${outcome.error}`);
}

/**
 * Uninstall-flavored rendering of the shared `Summary`. `summarize()`, its
 * four counts and the failure detail are untouched and shared with
 * `install`; only the words differ, because "installed: 12" reads as wrong
 * after twelve Tools were removed. `summary.installed` still means "the
 * action ran and changed the machine" and `summary.alreadyInstalled`
 * "already at the target end state" (see `lib/install-plan.ts`) — this only
 * picks the right label for each in uninstall's direction.
 */
export function formatUninstallSummary(summary: Summary): string {
  return [
    `  uninstalled: ${summary.installed}`,
    `  were not installed: ${summary.alreadyInstalled}`,
    `  not supported: ${summary.unsupported}`,
    `  failed: ${summary.failed}`,
    ...formatFailures(summary),
  ].join('\n');
}

function closingMessage(summary: Summary): string {
  if (summary.failed === 0) {
    return 'Uninstall finished.';
  }

  return summary.failed === 1 ? 'Finished with 1 failure.' : `Finished with ${summary.failed} failures.`;
}

/**
 * A guarded Stage is reachable by name and by name only: `--all` and
 * `--tag` sweep past it, and naming it prints what goes down with it first.
 */
function guard(tools: readonly Tool[], named: boolean, warn: (message: string) => void): readonly Tool[] {
  if (!named) {
    return tools.filter((tool) => !GUARDED_STAGES.has(tool.stage));
  }

  const guardedStages = new Set(tools.filter((tool) => GUARDED_STAGES.has(tool.stage)).map((tool) => tool.stage));
  for (const stage of guardedStages) {
    const warning = GUARDED_STAGE_WARNINGS[stage];
    if (warning) {
      warn(warning);
    }
  }

  return tools;
}

/**
 * Removes a subset of the Catalog: same contract as `install` (filters,
 * idempotency, failure policy, summary, exit code, `--dry-run`) reused
 * as-is, but with four guard rails deliberately asymmetric to it — getting
 * install wrong costs time, getting uninstall wrong costs the machine:
 *
 *  1. No argument at all is a usage error. Unlike `install`, a bare
 *     `uninstall` never assumes "everything".
 *  2. `--all` asks for confirmation before touching anything — except under
 *     `--dry-run`, which never executes anything anyway and exists
 *     precisely so the user can decide *before* confirming.
 *  3. Stage 0 (`homebrew`) and Stage 1 (`mise`) are never reached through
 *     `--all` or `--tag` — only by naming them, which warns first.
 *  4. Execution runs in reverse Stage order, so nothing is torn down before
 *     what depends on it.
 */
export async function uninstallCommand(input: UninstallInput, ctx: CliContext): Promise<UninstallResult> {
  const { reporter, runner, platform } = ctx;
  const named = input.tools.length > 0;

  if (!named && !input.tag && !input.all) {
    throw new CliError(
      'usage',
      '0xshell uninstall requires a named Tool, --tag or --all — nothing is assumed by default.',
    );
  }

  reporter.intro(input.dryRun ? '0xshell uninstall --dry-run' : '0xshell uninstall');

  if (input.all && !input.dryRun && !(await ctx.prompts.confirmUninstallAll())) {
    return { dryRun: false, confirmed: false };
  }

  const selected = selectTools(ctx.catalog, { names: input.tools, tag: input.tag });
  const tools = guard(selected, named, (message) => reporter.warn(message));

  if (input.dryRun) {
    const plan = await buildDryRunPlan(tools, runner, platform, 'uninstall');
    for (const line of formatDryRunPlan(plan, platform, 'uninstall')) {
      reporter.line(line);
    }
    reporter.outro('Nothing was executed.');
    return { dryRun: true, plan };
  }

  // Opened by `onToolStart` and closed by `onOutcome`, which
  // `runInstallPlan` always calls in that order, once each per Tool.
  let line: ReporterTask | undefined;

  const outcomes = await runInstallPlan(tools, runner, platform, {
    action: 'uninstall',
    onToolStart: (tool) => {
      line = reporter.task(`Uninstalling ${tool.id}`);
    },
    onOutcome: (outcome) => {
      if (line) {
        reportOutcome(line, outcome, platform);
        line = undefined;
      }
    },
    onWarning: (message) => reporter.warn(message),
  });

  const summary = summarize(outcomes);

  if (!named && !input.tag) {
    reporter.block(SUMMARY_TITLE, formatUninstallSummary(summary));
  }

  reporter.outro(closingMessage(summary));
  return { dryRun: false, summary, outcomes };
}
