import { defineCommand } from 'citty';
import { createDoctorCommand } from './commands/doctor';
import { createInstallCommand } from './commands/install';
import { createListCommand } from './commands/list';
import { createUninstallCommand } from './commands/uninstall';
import type { Runner } from './runner/runner';
import type { Platform } from './tool/platform';

/** Root command, built against a Runner and Plataforma so tests can inject both. */
export function createCli(runner: Runner, platform: Platform) {
  return defineCommand({
    meta: {
      name: '0xshell',
      description: 'Instala o setup de desenvolvimento numa máquina nova',
    },
    subCommands: {
      install: createInstallCommand(runner, platform),
      uninstall: createUninstallCommand(runner, platform),
      list: createListCommand(runner, platform),
      doctor: createDoctorCommand(runner, platform),
    },
  });
}
