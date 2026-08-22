import { defineCommand } from 'citty';
import { createDoctorCommand } from './commands/doctor';
import { createInstallCommand } from './commands/install';
import { createListCommand } from './commands/list';
import { createUninstallCommand } from './commands/uninstall';
import { createPlainReporter } from './reporter/plain-reporter';
import type { Reporter } from './reporter/reporter';
import type { Runner } from './runner/runner';
import type { Platform } from './tool/platform';

/**
 * `runner` (the machine) and `reporter` (the terminal) are handed down from
 * `index.ts`, the only place that looks at the real `process` — here they are
 * just values, so a test can build the whole CLI against a MockRunner and a
 * MockReporter.
 */
export function createCli(runner: Runner, platform: Platform, reporter: Reporter = createPlainReporter()) {
  return defineCommand({
    meta: {
      name: '0xshell',
      description: 'Instala o setup de desenvolvimento numa máquina nova',
    },
    subCommands: {
      install: createInstallCommand(runner, platform, { reporter }),
      uninstall: createUninstallCommand(runner, platform, { reporter }),
      list: createListCommand(runner, platform, { reporter }),
      doctor: createDoctorCommand(runner, platform, { reporter }),
    },
  });
}
