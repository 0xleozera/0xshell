import { defineCommand } from 'citty';
import type { Runner } from '../../runner/runner';
import type { Tool } from '../../tool/define-tool';
import type { Platform } from '../../tool/platform';
import { resolveForPlatform } from '../../tool/resolve-for-platform';
import { isUnsupported } from '../../tool/unsupported';
import { findTool } from './catalog';

/**
 * Builds the `install <tool>` command against a Runner, resolving each
 * Tool's recipe for the given Plataforma. `lookupTool` defaults to the
 * real Catálogo but is injectable so tests don't need to touch it.
 */
export function createInstallCommand(
  runner: Runner,
  platform: Platform,
  lookupTool: (id: string) => Tool | undefined = findTool,
) {
  return defineCommand({
    meta: {
      name: 'install',
      description: 'Instala uma ferramenta do catálogo',
    },
    args: {
      tool: {
        type: 'positional',
        description: 'id da ferramenta a instalar (ex.: slack)',
        required: true,
      },
    },
    async run({ args }) {
      const tool = lookupTool(args.tool);
      if (!tool) {
        console.error(`Ferramenta desconhecida: ${args.tool}`);
        process.exitCode = 1;
        return;
      }

      const entry = resolveForPlatform(tool, platform);
      if (isUnsupported(entry)) {
        console.log(`⊘ ${tool.id} não suportado em ${platform}: ${entry.reason}`);
        return;
      }

      const alreadyInstalled = await entry.isInstalled(runner);
      if (alreadyInstalled) {
        console.log(`✓ ${tool.id} já estava instalado`);
        return;
      }

      await entry.install(runner);
      console.log(`✓ ${tool.id} instalado`);
    },
  });
}
