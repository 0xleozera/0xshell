import { cancel, multiselect } from '@clack/prompts';
import type { Tool } from '../../tool/define-tool';

export type MultiselectPrompt = (options: {
  message: string;
  options: { value: string; label: string }[];
}) => Promise<string[] | symbol>;

/**
 * Backs `0xshell install --interactive`: opens a multiselect over the
 * Catalog and returns exactly the Tools the user marked.
 *
 * `multiselect` only ever resolves to a `symbol` on cancellation (its own
 * cancel sentinel, from `@clack/core`), so a plain `typeof` check stands in
 * for `@clack/prompts`' `isCancel` here — same result, no dependency on a
 * sentinel a fake `prompt` couldn't otherwise reproduce in a test.
 */
export async function promptTools(
  catalog: readonly Tool[],
  prompt: MultiselectPrompt = multiselect,
): Promise<readonly Tool[]> {
  const selected = await prompt({
    message: 'Selecione as ferramentas para instalar',
    options: catalog.map((tool) => ({ value: tool.id, label: tool.id })),
  });

  if (typeof selected === 'symbol') {
    cancel('Instalação cancelada.');
    return [];
  }

  const ids = new Set(selected);
  return catalog.filter((tool) => ids.has(tool.id));
}
