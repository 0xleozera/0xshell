import { defineCommand } from 'citty';
import { sortByStage } from '../../engine/stage-order';
import { createPlainReporter } from '../../reporter/plain-reporter';
import type { Reporter } from '../../reporter/reporter';
import type { Runner } from '../../runner/runner';
import type { Tool } from '../../tool/define-tool';
import type { Platform } from '../../tool/platform';
import { resolveForPlatform } from '../../tool/resolve-for-platform';
import { isUnsupported } from '../../tool/unsupported';
import { catalog } from '../install/catalog';

const NPM_NOTE = 'Nota: o npm vem junto com o node — não é um Tool do mise e não está no Catálogo.';

function formatTool(tool: Tool, platform: Platform): string {
  const entry = resolveForPlatform(tool, platform);
  const tags = tool.tags.length > 0 ? tool.tags.join(', ') : '-';
  const support = isUnsupported(entry)
    ? `⊘ não suportado em ${platform}: ${entry.reason}`
    : `✓ suportado em ${platform}`;

  return `${tool.id} [stage ${tool.stage}] [tags: ${tags}] ${support}`;
}

function closingMessage(total: number): string {
  return total === 1 ? '1 ferramenta no Catálogo.' : `${total} ferramentas no Catálogo.`;
}

export type ListCommandOptions = {
  readonly lookupCatalog?: () => readonly Tool[];
  readonly reporter?: Reporter;
};

/**
 * Builds the read-only `list` command: prints the whole Catalog, one line
 * per Tool, with Tag, Stage and support on the current Platform. Purely
 * definitional — it never calls `isInstalled()`, so it never needs the
 * Runner for its own logic. `runner` is still accepted so cli.ts can wire
 * every subcommand the same way and so the "no write command" test has a
 * real MockRunner to assert against.
 *
 * The rows are already formatted when they reach the Reporter (`line()`):
 * `list` describes the Catalog rather than reporting what happened to it,
 * so its markers say "supported here", not "this went well".
 */
export function createListCommand(_runner: Runner, platform: Platform, options: ListCommandOptions = {}) {
  const { lookupCatalog = () => catalog, reporter = createPlainReporter() } = options;

  return defineCommand({
    meta: {
      name: 'list',
      description: 'Lista o catálogo inteiro com Tag, Stage e suporte na plataforma atual',
    },
    run() {
      const tools = sortByStage(lookupCatalog());

      reporter.intro('0xshell list');

      // The whole Catalog goes out as one call, not one per Tool: a Reporter
      // is free to set each `line()` apart from the last (the interactive one
      // puts a blank rule between them), and twenty-two Tools spaced out like
      // that stop looking like a table. Sent together they stay one block —
      // and, line for line, it is the same text either way.
      if (tools.length > 0) {
        reporter.line(tools.map((tool) => formatTool(tool, platform)).join('\n'));
      }

      reporter.info(NPM_NOTE);
      reporter.outro(closingMessage(tools.length));
    },
  });
}
