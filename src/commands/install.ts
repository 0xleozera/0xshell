import { backupVersion, type Backup } from '../lib/backup';
import type { ConfigureResult } from '../lib/configuration';
import type { CliContext } from '../lib/context';
import { buildDryRunPlan, formatDryRunPlan, type DryRunEntry } from '../lib/dry-run';
import { runInstallPlan } from '../lib/install-plan';
import type { Outcome } from '../lib/outcome';
import type { Platform } from '../lib/platform';
import type { ReporterTask } from '../lib/reporter';
import { selectTools } from '../lib/select-tools';
import { formatFailures, summarize, SUMMARY_TITLE, type Summary } from '../lib/summary';
import type { Tool } from '../lib/tool';
import type { InstallInput } from '../schemas/commands';

export type InstallResult =
  | { readonly dryRun: true; readonly plan: readonly DryRunEntry[] }
  | { readonly dryRun: false; readonly summary: Summary; readonly outcomes: readonly Outcome[] };

const CONFIGURATION_SUFFIX: Record<ConfigureResult, string> = {
  applied: ' · configuração aplicada',
  unchanged: ' · configuração em dia',
};

function configurationSuffix(configuration: ConfigureResult | undefined): string {
  return configuration ? CONFIGURATION_SUFFIX[configuration] : '';
}

function reportOutcome(task: ReporterTask, outcome: Outcome, platform: Platform): void {
  if (outcome.status === 'installed') {
    return task.succeed(`${outcome.id} instalado${configurationSuffix(outcome.configuration)}`);
  }

  if (outcome.status === 'already-installed') {
    return task.succeed(`${outcome.id} já estava instalado${configurationSuffix(outcome.configuration)}`);
  }

  if (outcome.status === 'unsupported') {
    return task.skip(`${outcome.id} não suportado em ${platform}: ${outcome.reason}`);
  }

  task.fail(`${outcome.id} falhou: ${outcome.error}`);
}

export function formatInstallSummary(summary: Summary): string {
  return [
    `  instalados: ${summary.installed}`,
    `  já instalados: ${summary.alreadyInstalled}`,
    `  não suportados: ${summary.unsupported}`,
    `  falharam: ${summary.failed}`,
    ...formatFailures(summary),
  ].join('\n');
}

function closingMessage(summary: Summary): string {
  if (summary.failed === 0) {
    return 'Tudo pronto.';
  }

  return summary.failed === 1 ? 'Concluído com 1 falha.' : `Concluído com ${summary.failed} falhas.`;
}

function appliedConfiguration(outcome: Outcome): boolean {
  return (outcome.status === 'installed' || outcome.status === 'already-installed') && outcome.configuration === 'applied';
}

/**
 * The whole Catalog is the answer to "install what?" only when the user
 * asked for nothing in particular — that's the new-machine path, where the
 * point is to walk away while it runs. Any filter at all also means the
 * closing summary block is noise, since every Tool the user picked was
 * reported line by line.
 */
function isFiltered(input: InstallInput): boolean {
  return input.tools.length > 0 || Boolean(input.tag) || input.interactive;
}

async function chooseTools(input: InstallInput, ctx: CliContext): Promise<readonly Tool[]> {
  if (input.interactive) {
    return ctx.prompts.askToolsToInstall(ctx.catalog);
  }

  return selectTools(ctx.catalog, { names: input.tools, tag: input.tag });
}

/**
 * Installs a subset of the Catalog, or the whole Catalog when no filter is
 * given. Four ways to cut it down: by name (`install neovim docker`), by
 * `--tag`, via the `--interactive` multiselect, or not at all. `--dry-run`
 * reports what a real run would do without ever handing an install command
 * to the Runner. Every Tool with a Configuration is configured as part of
 * the same run (ADR-0006).
 */
export async function installCommand(input: InstallInput, ctx: CliContext): Promise<InstallResult> {
  const { reporter, runner, platform } = ctx;

  reporter.intro(input.dryRun ? '0xshell install --dry-run' : '0xshell install');

  const tools = await chooseTools(input, ctx);

  if (input.dryRun) {
    const plan = await buildDryRunPlan(tools, runner, platform, 'install');
    for (const line of formatDryRunPlan(plan, platform, 'install')) {
      reporter.line(line);
    }
    reporter.outro('Nada foi executado.');
    return { dryRun: true, plan };
  }

  // Opened by `onToolStart` and closed by `onOutcome`, which
  // `runInstallPlan` always calls in that order, once each per Tool.
  let line: ReporterTask | undefined;
  const backup: Backup = { home: ctx.home, version: backupVersion(ctx.now()) };

  const outcomes = await runInstallPlan(tools, runner, platform, {
    backup,
    onToolStart: (tool) => {
      line = reporter.task(`Instalando ${tool.id}`);
    },
    onOutcome: (outcome) => {
      if (line) {
        reportOutcome(line, outcome, platform);
        line = undefined;
      }
    },
    onWarning: (message) => reporter.warn(message),
  });

  const summary = summarize(outcomes);

  if (!isFiltered(input)) {
    reporter.block(SUMMARY_TITLE, formatInstallSummary(summary));
  }

  if (outcomes.some(appliedConfiguration)) {
    reporter.info(`Arquivos substituídos guardados no backup ${backup.version}: 0xshell restore ${backup.version}`);
  }

  reporter.outro(closingMessage(summary));
  return { dryRun: false, summary, outcomes };
}
