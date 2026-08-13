import { defineCommand } from 'citty';
import { sortByStage } from '../../engine/stage-order';
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

/**
 * Builds the read-only `list` command: prints the whole Catálogo, one line
 * per Tool, with Tag, Stage and support on the current Plataforma. Purely
 * definitional — it never calls `isInstalled()`, so it never needs the
 * Runner for its own logic. `runner` is still accepted so cli.ts can wire
 * every subcommand the same way and so the "no write command" test has a
 * real MockRunner to assert against.
 */
export function createListCommand(
  _runner: Runner,
  platform: Platform,
  lookupCatalog: () => readonly Tool[] = () => catalog,
) {
  return defineCommand({
    meta: {
      name: 'list',
      description: 'Lista o catálogo inteiro com Tag, Stage e suporte na plataforma atual',
    },
    run() {
      const tools = sortByStage(lookupCatalog());
      for (const tool of tools) {
        console.log(formatTool(tool, platform));
      }
      console.log(NPM_NOTE);
    },
  });
}
