import { defineCommand } from 'citty';
import type { Outcome } from '../../engine/outcome';
import { runInstallPlan } from '../../engine/run-install-plan';
import { selectTools } from '../../engine/select-tools';
import { exitCodeForSummary, summarize } from '../../engine/summary';
import { catalog, findTool } from '../install/catalog';
import type { Runner } from '../../runner/runner';
import type { Tool } from '../../tool/define-tool';
import type { Platform } from '../../tool/platform';
import { confirmAll } from './confirm-all';
import { runDryRun } from './dry-run';
import { formatUninstallSummary } from './format-summary';

/**
 * Stage 0 (homebrew) and Stage 1 (mise) — the guarded Stages, only ever
 * removed when named explicitly. Checked by `stage`, not by id, so the rule
 * stays correct for whichever Tool ends up there.
 */
const GUARDED_STAGES = new Set([0, 1]);

const GUARDED_STAGE_WARNINGS: Record<number, string> = {
  0: 'Aviso: desinstalar o Homebrew (Stage 0) leva junto tudo que ele instalou.',
  1: 'Aviso: desinstalar o mise (Stage 1) leva junto bun, pnpm, yarn, go, node e neovim.',
};

function reportOutcome(outcome: Outcome, platform: Platform): void {
  switch (outcome.status) {
    case 'installed':
      console.log(`✓ ${outcome.id} desinstalado`);
      break;
    case 'already-installed':
      console.log(`✓ ${outcome.id} não estava instalado`);
      break;
    case 'unsupported':
      console.log(`⊘ ${outcome.id} não suportado em ${platform}: ${outcome.reason}`);
      break;
    case 'failed':
      console.error(`✗ ${outcome.id} falhou: ${outcome.error}`);
      break;
  }
}

/**
 * Builds the `uninstall [tool...]` command: same contract as
 * `install` (filters, idempotency, failure policy, summary, exit code,
 * `--dry-run`) reused as-is, but with four guard rails deliberately
 * asymmetric to it — errar no install custa tempo, errar no uninstall custa
 * a máquina:
 *
 *  1. No argument at all is an error. Unlike `install`, a bare `uninstall`
 *     never assumes "everything".
 *  2. `--all` asks for interactive confirmation before touching anything —
 *     except under `--dry-run`, which never executes anything anyway and
 *     exists precisely so the user can decide *before* confirming.
 *  3. Stage 0 (`homebrew`) and Stage 1 (`mise`) are never reached through
 *     `--all` or `--tag` — only by naming them, which prints a warning
 *     about what goes with them first.
 *  4. Execution runs in reverse Stage order (`direction: 'desc'`, via
 *     `runInstallPlan`) so nothing is torn down before what depends on it.
 *
 * Reuses `Outcome`'s existing statuses rather than adding uninstall-specific
 * ones: `installed` means "the action ran and changed the machine" (here,
 * removed) and `already-installed` means "already in the target end state"
 * (here, already not installed) — see `run-install-plan.ts`. `summary.ts`'s
 * `summarize()`, `exitCodeForSummary()` and the failure policy are untouched
 * and shared with `install`; only the printed words differ, in
 * `reportOutcome` (per-Tool) and `format-summary.ts` (the closing Resumo) —
 * "instalados: 12" would read as wrong after removing twelve Tools.
 */
export function createUninstallCommand(
  runner: Runner,
  platform: Platform,
  lookupTool: (id: string) => Tool | undefined = findTool,
  lookupCatalog: () => readonly Tool[] = () => catalog,
  confirmAllPrompt: (message?: string) => Promise<boolean> = confirmAll,
) {
  return defineCommand({
    meta: {
      name: 'uninstall',
      description: 'Desinstala um subconjunto do catálogo — exige um Tool, --tag ou --all',
    },
    args: {
      tool: {
        type: 'positional',
        description: 'ids das ferramentas a desinstalar (ex.: neovim docker)',
        required: false,
      },
      tag: {
        type: 'string',
        description: 'desinstala apenas os Tools com esta Tag',
      },
      all: {
        type: 'boolean',
        description: 'desinstala o catálogo inteiro; pede confirmação interativa antes de executar',
        default: false,
      },
      dryRun: {
        type: 'boolean',
        description: 'mostra o que seria removido, sem executar nada',
        default: false,
      },
    },
    async run({ args }) {
      const names = args._.filter((name) => name.length > 0);
      const tag = args.tag;
      const all = args.all;

      if (names.length === 0 && !tag && !all) {
        console.error('0xshell uninstall requer um Tool nomeado, --tag ou --all — nada é assumido por padrão.');
        process.exitCode = 1;
        return;
      }

      if (all && !args.dryRun) {
        const confirmed = await confirmAllPrompt();
        if (!confirmed) {
          return;
        }
      }

      const selection = selectTools(lookupCatalog(), lookupTool, { names, tag });
      if (!selection.ok) {
        console.error(selection.error);
        process.exitCode = 1;
        return;
      }

      let tools: readonly Tool[];
      if (names.length > 0) {
        const guardedStages = new Set(
          selection.tools.filter((tool) => GUARDED_STAGES.has(tool.stage)).map((tool) => tool.stage),
        );
        for (const stage of guardedStages) {
          console.log(GUARDED_STAGE_WARNINGS[stage]);
        }
        tools = selection.tools;
      } else {
        tools = selection.tools.filter((tool) => !GUARDED_STAGES.has(tool.stage));
      }

      if (args.dryRun) {
        await runDryRun(tools, runner, platform);
        return;
      }

      const outcomes = await runInstallPlan(tools, runner, platform, {
        action: 'uninstall',
        direction: 'desc',
        onOutcome: (outcome) => reportOutcome(outcome, platform),
      });

      const summary = summarize(outcomes);
      process.exitCode = exitCodeForSummary(summary);

      const isFiltered = names.length > 0 || Boolean(tag);
      if (!isFiltered) {
        console.log(formatUninstallSummary(summary));
      }
    },
  });
}
