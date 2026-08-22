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
 * Prints exactly what `install` would do for each Tool, in Stage order,
 * without ever sending an install/uninstall command to the real Runner.
 *
 * `isInstalled()` is a read, so it deliberately does run against the real
 * `runner` — that's the useful half of "what would happen": it's how a dry
 * run tells "would install" apart from "already installed" instead of
 * blindly listing every Tool as pending. `install()` itself runs against a
 * throwaway `RecordingRunner`, purely to surface the exact commands it
 * would issue; the real `runner` never sees them.
 *
 * A dry run is a plan, not progress: a pending Tool prints one line per
 * command it would issue, so there is no single per-Tool line for the
 * Reporter to open and close. Every line goes out through `line()`,
 * already carrying the marker that says which of the three cases it is.
 */
export async function runDryRun(
  tools: readonly Tool[],
  runner: Runner,
  platform: Platform,
  reporter: Reporter = createPlainReporter(),
): Promise<void> {
  const ordered = sortByStage(tools);

  for (const tool of ordered) {
    const entry = resolveForPlatform(tool, platform);

    if (isUnsupported(entry)) {
      reporter.line(`⊘ ${tool.id} não suportado em ${platform}: ${entry.reason}`);
      continue;
    }

    const alreadyInstalled = await entry.isInstalled(runner);
    if (alreadyInstalled) {
      reporter.line(`= ${tool.id} já instalado, nada a fazer`);
      continue;
    }

    const recorder = new RecordingRunner();
    await entry.install(recorder);
    // One call per Tool, however many commands it takes: a Reporter may set
    // consecutive lines apart, and the commands of a single Tool belong
    // together. The text is the same, one command per line, either way.
    if (recorder.commands.length > 0) {
      reporter.line(recorder.commands.map((command) => `→ ${tool.id}: ${command.join(' ')}`).join('\n'));
    }
  }
}
