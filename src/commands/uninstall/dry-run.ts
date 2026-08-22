import { sortByStage } from '../../engine/stage-order';
import { createPlainReporter } from '../../reporter/plain-reporter';
import type { Reporter } from '../../reporter/reporter';
import { RecordingRunner } from '../../runner/recording-runner';
import type { Runner } from '../../runner/runner';
import type { Tool } from '../../tool/define-tool';
import type { Platform } from '../../tool/platform';
import { resolveForPlatform } from '../../tool/resolve-for-platform';
import { isUnsupported } from '../../tool/unsupported';

/**
 * Prints exactly what `uninstall` would do for each Tool, in reverse Stage
 * order, without ever sending an install/uninstall command to the real
 * Runner — the mirror of `commands/install/dry-run.ts`, including how it
 * reports: a plan is not progress, so its lines go out pre-formatted
 * through the Reporter's `line()`.
 *
 * `isInstalled()` is a read, so it deliberately does run against the real
 * `runner`; `uninstall()` runs against a throwaway `RecordingRunner`, purely
 * to surface the exact commands it would issue.
 */
export async function runDryRun(
  tools: readonly Tool[],
  runner: Runner,
  platform: Platform,
  reporter: Reporter = createPlainReporter(),
): Promise<void> {
  const ordered = sortByStage(tools, 'desc');

  for (const tool of ordered) {
    const entry = resolveForPlatform(tool, platform);

    if (isUnsupported(entry)) {
      reporter.line(`⊘ ${tool.id} não suportado em ${platform}: ${entry.reason}`);
      continue;
    }

    const isInstalled = await entry.isInstalled(runner);
    if (!isInstalled) {
      reporter.line(`= ${tool.id} não instalado, nada a fazer`);
      continue;
    }

    const recorder = new RecordingRunner();
    await entry.uninstall(recorder);
    // One call per Tool — see `commands/install/dry-run.ts`.
    if (recorder.commands.length > 0) {
      reporter.line(recorder.commands.map((command) => `→ ${tool.id}: ${command.join(' ')}`).join('\n'));
    }
  }
}
