import type { Tool } from './define-tool';
import type { Platform } from './platform';
import type { Recipe } from './recipe';
import type { Unsupported } from './unsupported';

export function resolveForPlatform(tool: Tool, platform: Platform): Recipe | Unsupported {
  return tool[platform];
}
