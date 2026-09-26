import type { Tool } from './tool';
import onePassword from './tools/1password';
import antigen from './tools/antigen';
import bun from './tools/bun';
import carapace from './tools/carapace';
import claude from './tools/claude';
import claudeCode from './tools/claude-code';
import cursorCli from './tools/cursor-cli';
import dbeaver from './tools/dbeaver';
import dia from './tools/dia';
import docker from './tools/docker';
import eza from './tools/eza';
import fzf from './tools/fzf';
import git from './tools/git';
import go from './tools/go';
import homebrew from './tools/homebrew';
import logitechGHub from './tools/logitech-g-hub';
import mise from './tools/mise';
import neovim from './tools/neovim';
import node from './tools/node';
import ohMyZsh from './tools/oh-my-zsh';
import orcaAi from './tools/orca-ai';
import pnpm from './tools/pnpm';
import raycast from './tools/raycast';
import slack from './tools/slack';
import spotify from './tools/spotify';
import warp from './tools/warp';
import whatsapp from './tools/whatsapp';
import yarn from './tools/yarn';
import zsh from './tools/zsh';

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
  // Shell: zsh writes ~/.zshrc before oh-my-zsh's installer looks for one,
  // and every other shell Tool is sourced from that file.
  zsh,
  ohMyZsh,
  antigen,
  fzf,
  eza,
  carapace,
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
