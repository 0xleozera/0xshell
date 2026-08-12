import type { Tool } from '../../tool/define-tool';
import slack from './tools/slack';

/** The Catálogo: every Tool sshell knows how to install. */
export const catalog: readonly Tool[] = [slack];

export function findTool(id: string): Tool | undefined {
  return catalog.find((tool) => tool.id === id);
}
