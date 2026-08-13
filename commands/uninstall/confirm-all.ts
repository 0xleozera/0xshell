import { cancel, confirm } from '@clack/prompts';

/** The slice of `@clack/prompts`' `confirm` this module depends on — narrow enough to fake in a test. */
export type ConfirmPrompt = (options: { message: string }) => Promise<boolean | symbol>;

/**
 * Backs `0xshell uninstall --all` (issue #11, guarda-corpo 2): errar no
 * `install` custa tempo, errar no `uninstall` custa a máquina, então
 * `--all` never runs a single command before a human confirms it. `prompt`
 * defaults to the real `confirm` but is injectable — same reasoning as
 * `promptTools` — so a test exercising this path resolves immediately
 * instead of hanging on real terminal input.
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
