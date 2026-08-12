import { renderUsage } from 'citty';
import { describe, expect, test } from 'bun:test';
import { createCli } from './cli';
import { createInstallCommand } from './commands/install';
import { MockRunner } from './runner/mock-runner';

describe('cli', () => {
  test('--help lists the install and uninstall subcommands', async () => {
    const usage = await renderUsage(createCli(new MockRunner(), 'darwin'));

    expect(usage).toContain('sshell');
    expect(usage).toContain('install');
    expect(usage).toContain('uninstall');
  });

  test('install --help documents the tool argument', async () => {
    const usage = await renderUsage(createInstallCommand(new MockRunner(), 'darwin'));

    expect(usage.toLowerCase()).toContain('tool');
  });
});
