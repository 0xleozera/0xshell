import { isAbsolute, join, relative } from 'node:path';
import { runChecked } from './helpers/run-checked';
import type { Runner } from './runner';

/**
 * One backup version: everything a single `install` (or `restore`) run moved
 * out of the way, under `~/.0xshell/backups/<version>/` (ADR-0006).
 */
export type Backup = {
  readonly home: string;
  readonly version: string;
};

/**
 * `saved`: the path existed and its content now lives in the backup.
 * `created`: the path did not exist, so restoring means removing it.
 */
export type BackupEntry = {
  readonly kind: 'saved' | 'created';
  readonly path: string;
};

const MANIFEST = 'manifest.tsv';
const ENTRY_KINDS = new Set<string>(['saved', 'created']);

export function backupsDir(home: string): string {
  return join(home, '.0xshell', 'backups');
}

function versionDir(backup: Backup): string {
  return join(backupsDir(backup.home), backup.version);
}

/** Sortable and readable at a glance: `20260926-143012`. */
export function backupVersion(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${day}-${time}`;
}

/**
 * Where a path's content is kept inside a backup: mirrored relative to the
 * home, so `files/.config/nvim` can be browsed like the original.
 */
export function savedCopyPath(backup: Backup, path: string): string {
  const inHome = relative(backup.home, path);

  if (inHome.startsWith('..') || isAbsolute(inHome)) {
    throw new Error(`${path} is outside the home and has no place in the backup`);
  }

  return join(versionDir(backup), 'files', inHome);
}

/**
 * Clears `path` for a write, keeping whatever was there: moved into the
 * backup and recorded as `saved`, or recorded as `created` when nothing was.
 * The manifest line is appended in the same script as the move, so a run that
 * dies halfway still leaves a manifest that matches the files.
 */
export async function moveAside(runner: Runner, backup: Backup, path: string): Promise<void> {
  const manifest = join(versionDir(backup), MANIFEST);

  await runChecked(runner, [
    'sh',
    '-c',
    'mkdir -p "$(dirname "$3")" && if [ -e "$1" ] || [ -L "$1" ]; then ' +
      'mkdir -p "$(dirname "$2")" && mv "$1" "$2" && printf "saved\\t%s\\n" "$1" >> "$3"; ' +
      'else printf "created\\t%s\\n" "$1" >> "$3"; fi',
    'sh',
    path,
    savedCopyPath(backup, path),
    manifest,
  ]);
}

/**
 * Keeps a copy of `path` before it is edited in place: the file stays where
 * it is, for the app that owns it, and the copy is recorded as `saved` — or
 * `created` when there was nothing yet — so `restore` treats it like any
 * file `moveAside` cleared.
 */
export async function copyAside(runner: Runner, backup: Backup, path: string): Promise<void> {
  const manifest = join(versionDir(backup), MANIFEST);

  await runChecked(runner, [
    'sh',
    '-c',
    'mkdir -p "$(dirname "$3")" && if [ -e "$1" ]; then ' +
      'mkdir -p "$(dirname "$2")" && cp -p "$1" "$2" && printf "saved\\t%s\\n" "$1" >> "$3"; ' +
      'else printf "created\\t%s\\n" "$1" >> "$3"; fi',
    'sh',
    path,
    savedCopyPath(backup, path),
    manifest,
  ]);
}

/**
 * Puts one entry back as it was when the backup was taken. The saved copy is
 * copied, not moved, so the same version can be restored again later. The
 * caller clears `path` first (with `moveAside`).
 */
export async function restoreEntry(runner: Runner, backup: Backup, entry: BackupEntry): Promise<void> {
  if (entry.kind === 'created') return;

  await runChecked(runner, [
    'sh',
    '-c',
    'mkdir -p "$(dirname "$2")" && cp -Rp "$1" "$2"',
    'sh',
    savedCopyPath(backup, entry.path),
    entry.path,
  ]);
}

/** Newest first. No backups directory yet reads as no backups. */
export async function listBackupVersions(runner: Runner, home: string): Promise<readonly string[]> {
  const result = await runner.run(['ls', '-1', backupsDir(home)]);
  if (result.exitCode !== 0) return [];

  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort()
    .reverse();
}

export function parseManifest(text: string): readonly BackupEntry[] {
  return text
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const [kind, ...path] = line.split('\t');
      if (!kind || !ENTRY_KINDS.has(kind) || path.length === 0) {
        throw new Error(`invalid line in the backup manifest: ${line}`);
      }
      return { kind: kind as BackupEntry['kind'], path: path.join('\t') };
    });
}

/** `undefined` when the version does not exist. */
export async function readBackup(runner: Runner, backup: Backup): Promise<readonly BackupEntry[] | undefined> {
  const result = await runner.run(['cat', join(versionDir(backup), MANIFEST)]);
  if (result.exitCode !== 0) return undefined;

  return parseManifest(result.stdout);
}
