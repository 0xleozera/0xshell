import type { Tool } from '../tool/define-tool';

export type SelectToolsOptions = {
  /** Explicit Tool ids (`install neovim docker`). Takes priority over `tag`. */
  readonly names?: readonly string[];
  /** A single Tag (`install --tag apps`). Ignored when `names` is non-empty. */
  readonly tag?: string;
};

export type SelectToolsResult =
  | { readonly ok: true; readonly tools: readonly Tool[] }
  | { readonly ok: false; readonly error: string };

/**
 * Chooses the subset of the Catalog an `install` or `uninstall` run acts
 * on: by name, by Tag, or the whole `catalog` when neither filter is given.
 * Selection is kept separate from the command layer — and from execution —
 * so both commands share it and so `--dry-run` can select the same Tools it
 * would install without touching the Runner.
 *
 * `findTool` (rather than searching `catalog` directly) is what makes a
 * name lookup fail loudly on an unknown id: a name outside the Catalog
 * always fails the whole selection, never installs a partial match in
 * silence.
 */
export function selectTools(
  catalog: readonly Tool[],
  findTool: (id: string) => Tool | undefined,
  options: SelectToolsOptions = {},
): SelectToolsResult {
  const names = options.names ?? [];

  if (names.length > 0) {
    const tools: Tool[] = [];
    const missing: string[] = [];

    for (const name of names) {
      const found = findTool(name);
      if (found) {
        tools.push(found);
      } else {
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      return { ok: false, error: `Ferramenta(s) desconhecida(s) no Catálogo: ${missing.join(', ')}` };
    }

    return { ok: true, tools };
  }

  if (options.tag) {
    return { ok: true, tools: catalog.filter((tool) => tool.tags.includes(options.tag as string)) };
  }

  return { ok: true, tools: [...catalog] };
}
