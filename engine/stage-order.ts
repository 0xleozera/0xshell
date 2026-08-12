import type { Tool } from '../tool/define-tool';

export type StageDirection = 'asc' | 'desc';

/**
 * Orders Tools by `stage` (0–3, ADR-0002). `desc` is reserved for #11's
 * uninstall, which needs to tear down in the opposite order things were
 * built — kept parameterized here rather than hard-coded so that ticket
 * doesn't need to reimplement the sort.
 */
export function sortByStage(tools: readonly Tool[], direction: StageDirection = 'asc'): Tool[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...tools].sort((a, b) => sign * (a.stage - b.stage));
}
