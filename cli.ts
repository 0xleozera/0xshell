import { defineCommand } from 'citty';
import { createInstallCommand } from './commands/install';
import type { Runner } from './runner/runner';

/** Root command, built against a Runner so tests can inject a mock. */
export function createCli(runner: Runner) {
  return defineCommand({
    meta: {
      name: 'sshell',
      description: 'Instala o setup de desenvolvimento numa máquina nova',
    },
    subCommands: {
      install: createInstallCommand(runner),
    },
  });
}
