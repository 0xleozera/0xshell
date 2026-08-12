import { defineCommand } from 'citty';
import { createInstallCommand } from './commands/install';
import type { Runner } from './runner/runner';
import type { Platform } from './tool/platform';

/** Root command, built against a Runner and Plataforma so tests can inject both. */
export function createCli(runner: Runner, platform: Platform) {
  return defineCommand({
    meta: {
      name: 'sshell',
      description: 'Instala o setup de desenvolvimento numa máquina nova',
    },
    subCommands: {
      install: createInstallCommand(runner, platform),
    },
  });
}
