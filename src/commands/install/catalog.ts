import type { Tool } from '../../tool/define-tool';
import onePassword from './tools/1password';
import bun from './tools/bun';
import claude from './tools/claude';
import claudeCode from './tools/claude-code';
import cursorCli from './tools/cursor-cli';
import dbeaver from './tools/dbeaver';
import dia from './tools/dia';
import docker from './tools/docker';
import git from './tools/git';
import go from './tools/go';
import homebrew from './tools/homebrew';
import logitechGHub from './tools/logitech-g-hub';
import mise from './tools/mise';
import neovim from './tools/neovim';
import node from './tools/node';
import orcaAi from './tools/orca-ai';
import pnpm from './tools/pnpm';
import raycast from './tools/raycast';
import slack from './tools/slack';
import spotify from './tools/spotify';
import warp from './tools/warp';
import whatsapp from './tools/whatsapp';
import yarn from './tools/yarn';

export const catalog: readonly Tool[] = [
  homebrew,
  mise,
  bun,
  pnpm,
  yarn,
  go,
  node,
  neovim,
  git,
  warp,
  orcaAi,
  slack,
  whatsapp,
  dia,
  claudeCode,
  claude,
  cursorCli,
  raycast,
  onePassword,
  docker,
  dbeaver,
  spotify,
  logitechGHub,
];

export function findTool(id: string): Tool | undefined {
  return catalog.find((tool) => tool.id === id);
}
