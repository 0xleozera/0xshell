import { CliError } from './errors';
import type { Tool } from './tool';

export type SelectToolsOptions = {
  /** Explicit Tool ids (`install neovim docker`). Takes priority over `tag`. */
  readonly names?: readonly string[];
  /** A single Tag (`install --tag apps`). Ignored when `names` is non-empty. */
  readonly tag?: string;
};

/**
 * Chooses the subset of the Catalog an `install` or `uninstall` run acts
 * on: by name, by Tag, or the whole Catalog when neither filter is given.
 * Selection is kept out of the command layer — and out of execution — so
 * both commands share it and so `--dry-run` can select the same Tools it
 * would install without touching the Runner.
 *
 * A name outside the Catalog fails the whole selection with a `usage`
 * error: never a partial run that silently drops the id the user typed
 * wrong.
 */
export function selectTools(catalog: readonly Tool[], options: SelectToolsOptions = {}): readonly Tool[] {
  const names = options.names ?? [];

  if (names.length > 0) {
    const found = names.map((name) => ({ name, tool: catalog.find((tool) => tool.id === name) }));
    const missing = found.filter((entry) => !entry.tool).map((entry) => entry.name);

    if (missing.length > 0) {
      throw new CliError('usage', `Unknown tool(s) in the Catalog: ${missing.join(', ')}`);
    }

    return found.flatMap((entry) => (entry.tool ? [entry.tool] : []));
  }

  if (options.tag) {
    const tag = options.tag;
    return catalog.filter((tool) => tool.tags.includes(tag));
  }

  return [...catalog];
}
