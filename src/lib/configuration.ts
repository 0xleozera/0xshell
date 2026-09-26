import { join } from 'node:path';
import { moveAside, type Backup } from './backup';
import { runChecked } from './helpers/run-checked';
import type { Command, Runner } from './runner';

/** One file a Tool owns, relative to its Configuration's `root`. */
export type ConfigFile = {
  readonly path: string;
  readonly content: string;
};

/**
 * The files 0xshell writes for a Tool after installing it (ADR-0006).
 * Contents ship inside the binary and are copied, never symlinked: the
 * compiled CLI runs on a machine with no checkout of this repository.
 *
 * `ownsRoot` says the whole `root` directory is this Tool's config (e.g.
 * `~/.config/nvim`): when anything in it is stale, the directory is backed up
 * as a unit and rewritten, so files left over from a previous config cannot
 * keep overriding the new one. Without it, `root` is shared (e.g. `$HOME`)
 * and only the stale files are backed up and rewritten.
 */
export type Configuration = {
  readonly root: string;
  readonly files: readonly ConfigFile[];
  readonly ownsRoot?: boolean;
};

/** `unchanged` means every file already matched, so nothing was touched. */
export type ConfigureResult = 'applied' | 'unchanged';

/** Absolute paths to move into the backup, then files to write, in that order. */
export type ConfigurationPlan = {
  readonly backups: readonly string[];
  readonly writes: readonly ConfigFile[];
};

// Content travels as an argv entry ($1), never interpolated into the script,
// so nothing in a dotfile can be read as shell syntax.
const matchesCommand = (path: string, content: string): Command => [
  'sh',
  '-c',
  'printf "%s" "$1" | cmp -s - "$2"',
  'sh',
  content,
  path,
];

const writeCommand = (path: string, content: string): Command => [
  'sh',
  '-c',
  'mkdir -p "$(dirname "$2")" && printf "%s" "$1" > "$2"',
  'sh',
  content,
  path,
];

function absolute(configuration: Configuration, file: ConfigFile): ConfigFile {
  return { path: join(configuration.root, file.path), content: file.content };
}

/**
 * Works out what applying a Configuration would change, issuing reads only
 * — `--dry-run` calls this against the real Runner, just like it calls
 * `isInstalled()`. An empty plan means the machine already matches.
 */
export async function planConfiguration(configuration: Configuration, runner: Runner): Promise<ConfigurationPlan> {
  const files = configuration.files.map((file) => absolute(configuration, file));
  const stale: ConfigFile[] = [];

  for (const file of files) {
    const result = await runner.run(matchesCommand(file.path, file.content));
    if (result.exitCode !== 0) stale.push(file);
  }

  if (stale.length === 0) return { backups: [], writes: [] };
  if (configuration.ownsRoot) return { backups: [configuration.root], writes: files };

  return { backups: stale.map((file) => file.path), writes: stale };
}

/**
 * Brings the machine in line with a Configuration. Whatever is in the way is
 * moved into `backup` before being replaced — a user's own edits are never
 * lost, only set aside, and `0xshell restore <version>` puts them back.
 */
export async function applyConfiguration(
  configuration: Configuration,
  runner: Runner,
  backup: Backup,
): Promise<ConfigureResult> {
  const plan = await planConfiguration(configuration, runner);

  if (plan.writes.length === 0) return 'unchanged';

  for (const path of plan.backups) {
    await moveAside(runner, backup, path);
  }

  for (const file of plan.writes) {
    await runChecked(runner, writeCommand(file.path, file.content));
  }

  return 'applied';
}
