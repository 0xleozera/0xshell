import { homedir } from 'node:os';
import { catalog } from './catalog';
import { resolvePlatform, type Platform } from './platform';
import type { Reporter } from './reporter';
import { createBunRunner, type Runner } from './runner';
import type { Tool } from './tool';

/**
 * The closed vocabulary of questions this CLI asks a human. Every one of
 * them has a flag that answers it instead (`install neovim docker` for the
 * multiselect, `--yes` for the confirmation), so no script ever depends
 * on a prompt.
 *
 * Cancelling any of them throws `CliError('cancelled')`.
 */
export type CliPrompts = {
  /** `install --interactive`: which Tools to install. */
  askToolsToInstall(catalog: readonly Tool[]): Promise<readonly Tool[]>;
  /** `uninstall --all`: the last word before the whole Catalog is removed. */
  confirmUninstallAll(): Promise<boolean>;
};

/**
 * Everything outside the command that a command is allowed to touch: the
 * machine (`runner`, ADR-0003), the terminal (`reporter`, ADR-0004), the
 * human (`prompts`), the Platform it all runs on and the Catalog it acts
 * upon. `home` and `now` are here so backups (ADR-0006) are named and placed
 * by values a test can fix, not by the real clock and home.
 *
 * It is assembled once, in `cli.ts`, and handed down as the tRPC context —
 * so a test drives the very same commands against a MockRunner, a
 * MockReporter and a Catalog of three fake Tools (ADR-0005).
 */
export type CliContext = {
  readonly runner: Runner;
  readonly reporter: Reporter;
  readonly platform: Platform;
  readonly catalog: readonly Tool[];
  readonly prompts: CliPrompts;
  readonly home: string;
  readonly now: () => Date;
};

/**
 * The composition root's half of the context: the real machine, the real
 * Catalog and the Platform this process is running on. The Reporter and the
 * prompts come in from `cli.ts`, which is the only place allowed to decide
 * how the terminal is rendered.
 */
export function createCliContext(reporter: Reporter, prompts: CliPrompts): CliContext {
  const home = homedir();

  return {
    runner: createBunRunner(home),
    reporter,
    platform: resolvePlatform(),
    catalog,
    prompts,
    home,
    now: () => new Date(),
  };
}
