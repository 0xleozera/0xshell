import {
  backupsDir,
  backupVersion,
  listBackupVersions,
  moveAside,
  readBackup,
  restoreEntry,
  type Backup,
  type BackupEntry,
} from '../lib/backup';
import type { CliContext } from '../lib/context';
import { displayPath } from '../lib/display-path';
import { CliError } from '../lib/errors';
import type { ReporterTask } from '../lib/reporter';
import { SUMMARY_TITLE } from '../lib/summary';
import type { RestoreInput } from '../schemas/commands';

export type RestoreFailure = {
  readonly path: string;
  readonly error: string;
};

/** Restore's own tally; `failed` is what the edge reads for the exit code. */
export type RestoreSummary = {
  readonly restored: number;
  readonly removed: number;
  readonly failed: number;
  readonly failures: readonly RestoreFailure[];
};

export type RestoreResult =
  | { readonly dryRun: true; readonly version: string; readonly entries: readonly BackupEntry[] }
  | {
      readonly dryRun: false;
      readonly version: string;
      /** The backup holding the state this restore replaced — itself restorable. */
      readonly snapshot: string;
      readonly summary: RestoreSummary;
    };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatVersions(versions: readonly string[]): string {
  return ['Backups disponíveis (mais recente primeiro):', ...versions.map((version) => `  ${version}`)].join('\n');
}

async function missingVersionError(ctx: CliContext, message: string): Promise<CliError> {
  const versions = await listBackupVersions(ctx.runner, ctx.home);

  if (versions.length === 0) {
    return new CliError('usage', `${message}\nNenhum backup em ${displayPath(backupsDir(ctx.home), ctx.home)}.`);
  }

  return new CliError('usage', `${message}\n${formatVersions(versions)}`);
}

function describeEntry(entry: BackupEntry, home: string): string {
  const path = displayPath(entry.path, home);
  return entry.kind === 'saved' ? `↺ ${path}: volta ao conteúdo do backup` : `✗ ${path}: removido (não existia)`;
}

function formatRestoreSummary(summary: RestoreSummary, home: string): string {
  return [
    `  restaurados: ${summary.restored}`,
    `  removidos: ${summary.removed}`,
    `  falharam: ${summary.failed}`,
    ...(summary.failures.length === 0
      ? []
      : ['Falhas:', ...summary.failures.map((failure) => `  ✗ ${displayPath(failure.path, home)}: ${failure.error}`)]),
  ].join('\n');
}

function tally(entries: readonly BackupEntry[], failures: readonly RestoreFailure[]): RestoreSummary {
  const failed = new Set(failures.map((failure) => failure.path));
  const done = entries.filter((entry) => !failed.has(entry.path));

  return {
    restored: done.filter((entry) => entry.kind === 'saved').length,
    removed: done.filter((entry) => entry.kind === 'created').length,
    failed: failures.length,
    failures,
  };
}

function reportEntry(task: ReporterTask, entry: BackupEntry, home: string): void {
  const path = displayPath(entry.path, home);
  task.succeed(entry.kind === 'saved' ? `${path} restaurado` : `${path} removido (não existia no backup)`);
}

/**
 * Puts the machine back the way a backup version found it: every file it
 * saved comes back, every file that run created goes away. Before touching a
 * path, the current one is moved into a fresh backup, so a restore is undone
 * by restoring the snapshot it reports.
 *
 * Without a version, nothing is restored: the available versions are listed
 * as a usage error, so a script never restores something it did not name.
 */
export async function restoreCommand(input: RestoreInput, ctx: CliContext): Promise<RestoreResult> {
  const { reporter, runner, home } = ctx;

  if (!input.version) {
    throw await missingVersionError(ctx, 'Informe a versão: 0xshell restore <versão>.');
  }

  const source: Backup = { home, version: input.version };
  const entries = await readBackup(runner, source);

  if (!entries) {
    throw await missingVersionError(ctx, `O backup ${input.version} não existe.`);
  }

  reporter.intro(input.dryRun ? '0xshell restore --dry-run' : '0xshell restore');

  if (input.dryRun) {
    if (entries.length > 0) {
      reporter.line(entries.map((entry) => describeEntry(entry, home)).join('\n'));
    }
    reporter.outro('Nada foi executado.');
    return { dryRun: true, version: input.version, entries };
  }

  const snapshot: Backup = { home, version: backupVersion(ctx.now()) };

  // Same second as the backup being restored: the snapshot would be written
  // into the very directory it is reading from.
  if (snapshot.version === source.version) {
    throw new CliError('failed', `O backup ${source.version} acabou de ser criado; rode o restore de novo.`);
  }

  const failures: RestoreFailure[] = [];

  for (const entry of entries) {
    const task = reporter.task(`Restaurando ${displayPath(entry.path, home)}`);

    try {
      await moveAside(runner, snapshot, entry.path);
      await restoreEntry(runner, source, entry);
      reportEntry(task, entry, home);
    } catch (error) {
      failures.push({ path: entry.path, error: errorMessage(error) });
      task.fail(`${displayPath(entry.path, home)} falhou: ${errorMessage(error)}`);
    }
  }

  const summary = tally(entries, failures);

  reporter.block(SUMMARY_TITLE, formatRestoreSummary(summary, home));
  reporter.info(`O estado anterior foi guardado no backup ${snapshot.version}.`);
  reporter.info('O próximo 0xshell install volta a aplicar a Configuração do 0xshell.');
  reporter.outro(summary.failed === 0 ? `Backup ${source.version} restaurado.` : 'Restauração concluída com falhas.');

  return { dryRun: false, version: source.version, snapshot: snapshot.version, summary };
}
