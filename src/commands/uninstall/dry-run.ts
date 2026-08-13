import { sortByStage } from '../../engine/stage-order';
import { RecordingRunner } from '../../runner/recording-runner';
import type { Runner } from '../../runner/runner';
import type { Tool } from '../../tool/define-tool';
import type { Platform } from '../../tool/platform';
import { resolveForPlatform } from '../../tool/resolve-for-platform';
import { isUnsupported } from '../../tool/unsupported';

/**
 * Prints exactly what `uninstall` would do for each Tool, in reverse Stage
 * order, without ever sending an install/uninstall command to the real
 * Runner — the mirror of `commands/install/dry-run.ts`.
 *
 * `isInstalled()` is a read, so it deliberately does run against the real
 * `runner`; `uninstall()` runs against a throwaway `RecordingRunner`, purely
 * to surface the exact commands it would issue.
 */
export async function runDryRun(tools: readonly Tool[], runner: Runner, platform: Platform): Promise<void> {
  const ordered = sortByStage(tools, 'desc');

  for (const tool of ordered) {
    const entry = resolveForPlatform(tool, platform);

    if (isUnsupported(entry)) {
      console.log(`⊘ ${tool.id} não suportado em ${platform}: ${entry.reason}`);
      continue;
    }

    const isInstalled = await entry.isInstalled(runner);
    if (!isInstalled) {
      console.log(`= ${tool.id} não instalado, nada a fazer`);
      continue;
    }

    const recorder = new RecordingRunner();
    await entry.uninstall(recorder);
    for (const command of recorder.commands) {
      console.log(`→ ${tool.id}: ${command.join(' ')}`);
    }
  }
}
