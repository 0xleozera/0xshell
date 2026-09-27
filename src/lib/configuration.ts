import { join } from 'node:path';
import { copyAside, moveAside, type Backup } from './backup';
import { runChecked } from './helpers/run-checked';
import type { Command, Runner } from './runner';

/** One file a Tool owns, relative to its Configuration's `root`. */
export type ConfigFile = {
  readonly path: string;
  readonly content: string;
};

/**
 * One key in a file the Tool's app owns and keeps writing to (Warp's
 * settings.toml, Hermes' config.yaml) — a file 0xshell must not replace as a
 * whole. Only the line for `key` inside `section` is set; every other line
 * stays as the app and the user left it.
 *
 * `section` is a TOML table (`appearance.themes`), a top-level YAML key
 * (`display`, whose keys are indented two spaces) or, for JSON, the dotted
 * path of the parent object (`''` for the top level). `value` is written as
 * is, already in the file's syntax: `"gruvbox_dark"`, `gruvbox`, `"dark"`.
 *
 * TOML and YAML are edited line by line, so comments and layout survive.
 * JSON has neither, and is parsed and written back with two-space
 * indentation, keys in their original order.
 */
export type ConfigSetting = {
  readonly path: string;
  readonly format: 'toml' | 'yaml' | 'json';
  readonly section: string;
  readonly key: string;
  readonly value: string;
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
 *
 * `settings` are single keys in files the app owns, set in place. A file one
 * changes is copied into the backup first, so `restore` brings it back whole.
 */
export type Configuration = {
  readonly root: string;
  readonly files: readonly ConfigFile[];
  readonly ownsRoot?: boolean;
  readonly settings?: readonly ConfigSetting[];
};

/** `unchanged` means every file already matched, so nothing was touched. */
export type ConfigureResult = 'applied' | 'unchanged';

/**
 * Absolute paths to move into the backup, then files to write, then settings
 * to set in place (their files are copied into the backup, not moved).
 */
export type ConfigurationPlan = {
  readonly backups: readonly string[];
  readonly writes: readonly ConfigFile[];
  readonly edits: readonly ConfigEdit[];
};

/** A setting still to apply; a JSON one carries the whole file it becomes. */
export type ConfigEdit = ConfigSetting & { readonly json?: string };

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

// Prints the file with `line` as the only `key` line in `header`'s section:
// replaced where it was, added at the end of the section, or appended with
// its header when the section is missing. Everything reaches awk as -v
// variables, never as program text.
const SET_KEY_AWK = `
$0 == header { print; inside = 1; next }
inside && $0 ~ next_section { if (!done) { print line; done = 1 } inside = 0 }
inside && $0 ~ key_line { if (!done) { print line; done = 1 } next }
{ print }
END {
  if (inside && !done) { print line; done = 1 }
  if (!done) { if (NR > 0) print ""; print header; print line }
}`;

function setKeyScript(setting: ConfigSetting & { readonly format: 'toml' | 'yaml' }): readonly string[] {
  const { format, section, key, value } = setting;

  if (format === 'toml') {
    return [`[${section}]`, `${key} = ${value}`, `^[[:space:]]*${key}[[:space:]]*=`, '^[[:space:]]*[[]'];
  }

  return [`${section}:`, `  ${key}: ${value}`, `^  ${key}:`, '^[^[:space:]#]'];
}

// $1 the file (it may not exist yet), $2..$5 header, line, key_line,
// next_section, $6 the awk program.
const SET_KEY =
  '{ cat "$1" 2>/dev/null || true; } | ' +
  'awk -v header="$2" -v line="$3" -v key_line="$4" -v next_section="$5" "$6"';

function setKeyArgs(path: string, setting: ConfigSetting & { readonly format: 'toml' | 'yaml' }): readonly string[] {
  return ['sh', path, ...setKeyScript(setting), SET_KEY_AWK];
}

const settingMatchesCommand = (path: string, setting: ConfigSetting & { readonly format: 'toml' | 'yaml' }): Command => [
  'sh',
  '-c',
  `${SET_KEY} | cmp -s - "$1"`,
  ...setKeyArgs(path, setting),
];

// Rewritten through `cat >`, not `mv`, so the app's file keeps its inode and
// permissions — an app watching it sees an edit, not a new file.
const setKeyCommand = (path: string, setting: ConfigSetting & { readonly format: 'toml' | 'yaml' }): Command => [
  'sh',
  '-c',
  `mkdir -p "$(dirname "$1")" && tmp=$(mktemp) && ${SET_KEY} > "$tmp" && cat "$tmp" > "$1" && rm -f "$tmp"`,
  ...setKeyArgs(path, setting),
];

/** The file as `setting` wants it; `undefined` when it already is. */
async function jsonWithSetting(runner: Runner, setting: ConfigSetting): Promise<string | undefined> {
  const read = await runner.run(['cat', setting.path]);
  const current = read.exitCode === 0 ? read.stdout : '';
  let document: unknown;
  try {
    document = current.trim() === '' ? {} : JSON.parse(current);
  } catch {
    throw new Error(`${setting.path} is not valid JSON; not touching it`);
  }

  let parent = document as Record<string, unknown>;
  for (const part of setting.section.split('.').filter((entry) => entry.length > 0)) {
    const next = parent[part];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) parent[part] = {};
    parent = parent[part] as Record<string, unknown>;
  }
  parent[setting.key] = JSON.parse(setting.value);

  const unchanged = JSON.stringify(current.trim() === '' ? {} : JSON.parse(current)) === JSON.stringify(document);
  return unchanged ? undefined : `${JSON.stringify(document, null, 2)}\n`;
}

function absolute(configuration: Configuration, file: ConfigFile): ConfigFile {
  return { path: join(configuration.root, file.path), content: file.content };
}

function absoluteSetting(configuration: Configuration, setting: ConfigSetting): ConfigSetting {
  return { ...setting, path: join(configuration.root, setting.path) };
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

  const edits: ConfigEdit[] = [];
  for (const setting of (configuration.settings ?? []).map((entry) => absoluteSetting(configuration, entry))) {
    if (setting.format === 'json') {
      const json = await jsonWithSetting(runner, setting);
      if (json !== undefined) edits.push({ ...setting, json });
      continue;
    }
    const result = await runner.run(settingMatchesCommand(setting.path, { ...setting, format: setting.format }));
    if (result.exitCode !== 0) edits.push(setting);
  }

  if (stale.length === 0) return { backups: [], writes: [], edits };
  if (configuration.ownsRoot) return { backups: [configuration.root], writes: files, edits };

  return { backups: stale.map((file) => file.path), writes: stale, edits };
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

  if (plan.writes.length === 0 && plan.edits.length === 0) return 'unchanged';

  for (const path of plan.backups) {
    await moveAside(runner, backup, path);
  }

  for (const file of plan.writes) {
    await runChecked(runner, writeCommand(file.path, file.content));
  }

  // One copy per file, however many of its keys change.
  const edited = new Set<string>();
  for (const setting of plan.edits) {
    if (!edited.has(setting.path)) {
      await copyAside(runner, backup, setting.path);
      edited.add(setting.path);
    }
    await runChecked(
      runner,
      setting.format === 'json'
        ? writeCommand(setting.path, setting.json ?? '')
        : setKeyCommand(setting.path, { ...setting, format: setting.format }),
    );
  }

  return 'applied';
}
