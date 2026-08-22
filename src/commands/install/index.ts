import { defineCommand } from 'citty';
import { selectTools } from '../../engine/select-tools';
import { exitCodeForSummary, formatSummary, summarize, SUMMARY_TITLE, type Summary } from '../../engine/summary';
import type { Outcome } from '../../engine/outcome';
import { runInstallPlan } from '../../engine/run-install-plan';
import { createPlainReporter } from '../../reporter/plain-reporter';
import type { Reporter, ReporterTask } from '../../reporter/reporter';
import type { Runner } from '../../runner/runner';
import type { Tool } from '../../tool/define-tool';
import type { Platform } from '../../tool/platform';
import { catalog, findTool } from './catalog';
import { runDryRun } from './dry-run';
import { promptTools } from './prompt-tools';

function reportOutcome(task: ReporterTask, outcome: Outcome, platform: Platform): void {
  switch (outcome.status) {
    case 'installed':
      task.succeed(`${outcome.id} instalado`);
      break;
    case 'already-installed':
      task.succeed(`${outcome.id} já estava instalado`);
      break;
    case 'unsupported':
      task.skip(`${outcome.id} não suportado em ${platform}: ${outcome.reason}`);
      break;
    case 'failed':
      task.fail(`${outcome.id} falhou: ${outcome.error}`);
      break;
  }
}

function closingMessage(summary: Summary): string {
  if (summary.failed === 0) {
    return 'Tudo pronto.';
  }

  return summary.failed === 1 ? 'Concluído com 1 falha.' : `Concluído com ${summary.failed} falhas.`;
}

/**
 * `reporter` defaults to the plain rendering rather than to
 * `resolveReporter()`: choosing by what `process.stdout` happens to be is
 * the composition root's job (`index.ts`), and a command that decided it for
 * itself would render differently under `bun test` depending on whether the
 * suite was run from a terminal or from CI.
 */
export type InstallCommandOptions = {
  readonly lookupTool?: (id: string) => Tool | undefined;
  readonly lookupCatalog?: () => readonly Tool[];
  readonly promptForTools?: (catalog: readonly Tool[]) => Promise<readonly Tool[]>;
  readonly reporter?: Reporter;
};

/**
 * Builds the `install [tool...]` command against a Runner, resolving each
 * Tool's recipe for the given Platform. Four ways to cut the Catalog
 * down: by name (`install neovim docker`), by `--tag`, via an
 * `--interactive` multiselect, or not at all — no argument still installs
 * the whole Catalog, no prompt, since that's the new-machine path where
 * the user wants to walk away while it runs. `--dry-run` prints what a real
 * run would do without ever handing an install/uninstall command to
 * `runner`.
 *
 * citty (`^0.2.2`) has no variadic positional, so tool names are read off
 * `args._` — the raw positional list citty always keeps intact — rather
 * than the single `tool` positional slot, which stays only for `--help`.
 */
export function createInstallCommand(runner: Runner, platform: Platform, options: InstallCommandOptions = {}) {
  const {
    lookupTool = findTool,
    lookupCatalog = () => catalog,
    promptForTools = promptTools,
    reporter = createPlainReporter(),
  } = options;

  return defineCommand({
    meta: {
      name: 'install',
      description: 'Instala um subconjunto do catálogo, ou o catálogo inteiro se nenhum filtro for informado',
    },
    args: {
      tool: {
        type: 'positional',
        description: 'ids das ferramentas a instalar (ex.: neovim docker); se omitido, instala o catálogo inteiro',
        required: false,
      },
      tag: {
        type: 'string',
        description: 'instala apenas os Tools com esta Tag',
      },
      interactive: {
        type: 'boolean',
        description: 'abre um multiselect para escolher os Tools a instalar',
        default: false,
      },
      dryRun: {
        type: 'boolean',
        description: 'mostra o que seria executado, sem executar nada',
        default: false,
      },
    },
    async run({ args }) {
      const names = args._.filter((name) => name.length > 0);
      const tag = args.tag;
      const isFiltered = names.length > 0 || Boolean(tag) || args.interactive;

      reporter.intro(args.dryRun ? '0xshell install --dry-run' : '0xshell install');

      let tools: readonly Tool[];
      if (args.interactive) {
        tools = await promptForTools(lookupCatalog());
        // Nothing selected, or the prompt was cancelled — which
        // `promptTools` already reported. Ending here keeps the cancellation
        // as the last word instead of closing with "Tudo pronto.".
        if (tools.length === 0) {
          return;
        }
      } else {
        const selection = selectTools(lookupCatalog(), lookupTool, { names, tag });
        if (!selection.ok) {
          reporter.error(selection.error);
          process.exitCode = 1;
          return;
        }
        tools = selection.tools;
      }

      if (args.dryRun) {
        await runDryRun(tools, runner, platform, reporter);
        reporter.outro('Nada foi executado.');
        return;
      }

      // Opened by `onToolStart` and closed by `onOutcome`, which
      // `runInstallPlan` always calls in that order, once each per Tool.
      let line: ReporterTask | undefined;

      const outcomes = await runInstallPlan(tools, runner, platform, {
        onToolStart: (tool) => {
          line = reporter.task(`Instalando ${tool.id}`);
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
      process.exitCode = exitCodeForSummary(summary);

      if (!isFiltered) {
        reporter.block(SUMMARY_TITLE, formatSummary(summary));
      }

      reporter.outro(closingMessage(summary));
    },
  });
}
