import { defineCommand } from 'citty';
import type { Runner } from '../../runner/runner';
import { findTool } from './catalog';

/**
 * Builds the `install <tool>` command against a Runner. Only `darwin` is
 * wired up for now — platform resolution is #3.
 */
export function createInstallCommand(runner: Runner) {
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
      const tool = findTool(args.tool);
      if (!tool) {
        console.error(`Ferramenta desconhecida: ${args.tool}`);
        process.exitCode = 1;
        return;
      }

      const recipe = tool.darwin;
      const alreadyInstalled = await recipe.isInstalled(runner);
      if (alreadyInstalled) {
        console.log(`✓ ${tool.id} já estava instalado`);
        return;
      }

      await recipe.install(runner);
      console.log(`✓ ${tool.id} instalado`);
    },
  });
}
