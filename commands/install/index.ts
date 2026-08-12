import { defineCommand } from 'citty';
import { exitCodeForSummary, formatSummary, summarize } from '../../engine/summary';
import type { Outcome } from '../../engine/outcome';
import { runInstallPlan } from '../../engine/run-install-plan';
import type { Runner } from '../../runner/runner';
import type { Tool } from '../../tool/define-tool';
import type { Platform } from '../../tool/platform';
import { catalog, findTool } from './catalog';

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
 * Builds the `install [tool]` command against a Runner, resolving each
 * Tool's recipe for the given Plataforma. With a `tool` id it installs just
 * that one; without it, it runs the whole Catálogo through the install
 * engine (Stage order, Stage-0-fatal failure policy) and prints the final
 * summary. `lookupTool` / `lookupCatalog` default to the real Catálogo but
 * are injectable so tests don't need to touch it.
 */
export function createInstallCommand(
  runner: Runner,
  platform: Platform,
  lookupTool: (id: string) => Tool | undefined = findTool,
  lookupCatalog: () => readonly Tool[] = () => catalog,
) {
  return defineCommand({
    meta: {
      name: 'install',
      description: 'Instala uma ferramenta do catálogo, ou o catálogo inteiro se nenhuma for informada',
    },
    args: {
      tool: {
        type: 'positional',
        description: 'id da ferramenta a instalar (ex.: slack); se omitido, instala o catálogo inteiro',
        required: false,
      },
    },
    async run({ args }) {
      const singleTool = args.tool ? lookupTool(args.tool) : undefined;
      if (args.tool && !singleTool) {
        console.error(`Ferramenta desconhecida: ${args.tool}`);
        process.exitCode = 1;
        return;
      }

      const tools = singleTool ? [singleTool] : lookupCatalog();

      const outcomes = await runInstallPlan(tools, runner, platform, {
        onOutcome: (outcome) => reportOutcome(outcome, platform),
      });

      const summary = summarize(outcomes);
      process.exitCode = exitCodeForSummary(summary);

      if (!singleTool) {
        console.log(formatSummary(summary));
      }
    },
  });
}
