import type { Tool } from './define-tool';
import type { Platform } from './platform';
import type { Recipe } from './recipe';
import type { Unsupported } from './unsupported';

/**
 * Resolves a Tool's Recipe (or `unsupported(motivo)`) for one Plataforma.
 * The single point `install`, `doctor` and `list` all resolve through.
 */
export function resolveForPlatform(tool: Tool, platform: Platform): Recipe | Unsupported {
  return tool[platform];
}
