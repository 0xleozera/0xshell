import { cancel, confirm } from '@clack/prompts';

export type ConfirmPrompt = (options: { message: string }) => Promise<boolean | symbol>;

/**
 * Backs `0xshell uninstall --all`: getting `install` wrong costs time,
 * getting `uninstall` wrong costs the machine, so `--all` never runs a
 * single command before a human confirms it.
 *
 * A cancelled prompt (Ctrl+C) is treated the same as declining: nothing
 * runs.
 */
export async function confirmAll(
  message = 'Isso vai desinstalar TODO o Catálogo. Confirma?',
  prompt: ConfirmPrompt = confirm,
): Promise<boolean> {
  const answer = await prompt({ message });

  if (typeof answer === 'symbol') {
    cancel('Desinstalação cancelada.');
    return false;
  }

  return answer;
}
