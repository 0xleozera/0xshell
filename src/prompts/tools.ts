import { confirm, multiselect } from '@clack/prompts';
import type { CliPrompts } from '../lib/context';
import { CliError } from '../lib/errors';
import type { Tool } from '../lib/tool';

export type MultiselectPrompt = (options: {
  message: string;
  options: { value: string; label: string }[];
}) => Promise<string[] | symbol>;

export type ConfirmPrompt = (options: { message: string }) => Promise<boolean | symbol>;

const UNINSTALL_ALL_MESSAGE = 'This will uninstall the ENTIRE Catalog. Confirm?';

/**
 * A clack prompt only ever resolves to a `symbol` on cancellation (its own
 * cancel sentinel, from `@clack/core`), so a plain `typeof` check stands in
 * for `@clack/prompts`' `isCancel` here — same result, and a fake prompt in
 * a test can reproduce it, which it could not do with the sentinel itself.
 *
 * Cancelling is a real exit path, not an error: it becomes the one tagged
 * error the edge already knows how to translate (exit 130).
 */
function orCancel<T>(value: T | symbol, message: string): T {
  if (typeof value === 'symbol') {
    throw new CliError('cancelled', message);
  }

  return value;
}

/**
 * Backs `0xshell install --interactive`: opens a multiselect over the
 * Catalog and returns exactly the Tools the user marked. Which Tools are
 * offered is decided by the command and arrives as a parameter — this only
 * asks the question.
 */
export async function askToolsToInstall(
  catalog: readonly Tool[],
  prompt: MultiselectPrompt = multiselect,
): Promise<readonly Tool[]> {
  const selected = orCancel(
    await prompt({
      message: 'Select the tools to install',
      options: catalog.map((tool) => ({ value: tool.id, label: tool.id })),
    }),
    'Install cancelled.',
  );

  const ids = new Set(selected);
  return catalog.filter((tool) => ids.has(tool.id));
}

/**
 * Backs `0xshell uninstall --all`: getting `install` wrong costs time,
 * getting `uninstall` wrong costs the machine, so `--all` never runs a
 * single command before a human confirms it.
 */
export async function confirmUninstallAll(
  message: string = UNINSTALL_ALL_MESSAGE,
  prompt: ConfirmPrompt = confirm,
): Promise<boolean> {
  return orCancel(await prompt({ message }), 'Uninstall cancelled.');
}

/** The clack-backed answers, wired into the context by `cli.ts`. */
export const clackPrompts: CliPrompts = {
  askToolsToInstall: (catalog) => askToolsToInstall(catalog),
  confirmUninstallAll: () => confirmUninstallAll(),
};
