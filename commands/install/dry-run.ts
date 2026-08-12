import { sortByStage } from '../../engine/stage-order';
import { RecordingRunner } from '../../runner/recording-runner';
import type { Runner } from '../../runner/runner';
import type { Tool } from '../../tool/define-tool';
import type { Platform } from '../../tool/platform';
import { resolveForPlatform } from '../../tool/resolve-for-platform';
import { isUnsupported } from '../../tool/unsupported';

/**
 * Prints exactly what `install` would do for each Tool, in Stage order,
 * without ever sending an install/uninstall command to the real Runner
 * (issue #6).
 *
 * `isInstalled()` is a read, so it deliberately does run against the real
 * `runner` — that's the useful half of "what would happen": it's how a dry
 * run tells "would install" apart from "already installed" instead of
 * blindly listing every Tool as pending. `install()` itself runs against a
 * throwaway `RecordingRunner`, purely to surface the exact commands it
 * would issue; the real `runner` never sees them.
 */
export async function runDryRun(tools: readonly Tool[], runner: Runner, platform: Platform): Promise<void> {
  const ordered = sortByStage(tools);

  for (const tool of ordered) {
    const entry = resolveForPlatform(tool, platform);

    if (isUnsupported(entry)) {
      console.log(`⊘ ${tool.id} não suportado em ${platform}: ${entry.reason}`);
      continue;
    }

    const alreadyInstalled = await entry.isInstalled(runner);
    if (alreadyInstalled) {
      console.log(`= ${tool.id} já instalado, nada a fazer`);
      continue;
    }

    const recorder = new RecordingRunner();
    await entry.install(recorder);
    for (const command of recorder.commands) {
      console.log(`→ ${tool.id}: ${command.join(' ')}`);
    }
  }
}
