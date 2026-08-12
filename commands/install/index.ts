import { defineCommand } from 'citty';
import { selectTools } from '../../engine/select-tools';
import { exitCodeForSummary, formatSummary, summarize } from '../../engine/summary';
import type { Outcome } from '../../engine/outcome';
import { runInstallPlan } from '../../engine/run-install-plan';
import type { Runner } from '../../runner/runner';
import type { Tool } from '../../tool/define-tool';
import type { Platform } from '../../tool/platform';
import { catalog, findTool } from './catalog';
import { runDryRun } from './dry-run';
import { promptTools } from './prompt-tools';

function reportOutcome(outcome: Outcome, platform: Platform): void {
  switch (outcome.status) {
    case 'installed':
      console.log(`✓ ${outcome.id} instalado`);
      break;
    case 'already-installed':
      console.log(`✓ ${outcome.id} já estava instalado`);
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
 * Builds the `install [tool...]` command against a Runner, resolving each
 * Tool's recipe for the given Plataforma (issue #6). Four ways to cut the
 * Catálogo down: by name (`install neovim docker`), by `--tag`, via an
 * `--interactive` clack multiselect, or not at all — no argument still
 * installs the whole Catálogo, no prompt, since that's the new-machine path
 * where the user wants to walk away while it runs. `--dry-run` prints what
 * a real run would do (`commands/install/dry-run.ts`) without ever handing
 * an install/uninstall command to `runner`.
 *
 * citty (`^0.2.2`) has no variadic positional, so tool names are read off
 * `args._` — the raw positional list citty always keeps intact — rather
 * than the single `tool` positional slot, which stays only for `--help`.
 *
 * `lookupTool` / `lookupCatalog` / `promptForTools` default to the real
 * Catálogo and the real clack prompt but are injectable so tests don't
 * touch either.
 */
export function createInstallCommand(
  runner: Runner,
  platform: Platform,
  lookupTool: (id: string) => Tool | undefined = findTool,
  lookupCatalog: () => readonly Tool[] = () => catalog,
  promptForTools: (catalog: readonly Tool[]) => Promise<readonly Tool[]> = promptTools,
) {
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

      let tools: readonly Tool[];
      if (args.interactive) {
        tools = await promptForTools(lookupCatalog());
      } else {
        const selection = selectTools(lookupCatalog(), lookupTool, { names, tag });
        if (!selection.ok) {
          console.error(selection.error);
          process.exitCode = 1;
          return;
        }
        tools = selection.tools;
      }

      if (args.dryRun) {
        await runDryRun(tools, runner, platform);
        return;
      }

      const outcomes = await runInstallPlan(tools, runner, platform, {
        onOutcome: (outcome) => reportOutcome(outcome, platform),
      });

      const summary = summarize(outcomes);
      process.exitCode = exitCodeForSummary(summary);

      if (!isFiltered) {
        console.log(formatSummary(summary));
      }
    },
  });
}
