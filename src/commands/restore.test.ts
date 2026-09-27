import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CliContext, CliPrompts } from '../lib/context';
import { CliError } from '../lib/errors';
import { createMockReporter, type MockReporter } from '../lib/mock-reporter';
import { createBunRunner } from '../lib/runner';
import { defineTool, type Tool } from '../lib/tool';
import { installCommand } from './install';
import { restoreCommand } from './restore';

const noPrompts: CliPrompts = {
  askToolsToInstall: async () => {
    throw new Error('the prompt should not have been opened');
  },
  confirmUninstallAll: async () => {
    throw new Error('the prompt should not have been opened');
  },
};

// Drives install and restore against the real shell in a throwaway home:
// the point is what ends up on disk, which a MockRunner cannot show.
let home: string;
let clock: Date;
let reporter: MockReporter;

function shellTool(): Tool {
  const recipe = {
    install: async () => {},
    uninstall: async () => {},
    isInstalled: async () => true,
  };

  return defineTool({
    id: 'zsh',
    stage: 3,
    tags: [],
    darwin: recipe,
    linux: recipe,
    configuration: {
      root: home,
      files: [
        { path: '.zshrc', content: 'ZSH_THEME="gruvbox"\n' },
        { path: '.antigenrc', content: 'antigen apply\n' },
      ],
    },
  });
}

function context(): CliContext {
  return {
    runner: createBunRunner(),
    reporter,
    platform: 'darwin',
    catalog: [shellTool()],
    prompts: noPrompts,
    home,
    now: () => clock,
  };
}

async function install(at: Date): Promise<void> {
  clock = at;
  await installCommand({ tools: [], interactive: false, dryRun: false }, context());
}

function read(path: string): string | undefined {
  const absolute = join(home, path);
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : undefined;
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), '0xshell-restore-'));
  reporter = createMockReporter();
  writeFileSync(join(home, '.zshrc'), 'ZSH_THEME="robbyrussell"\n');
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

describe('restore command', () => {
  test('puts back what install replaced and removes what install created', async () => {
    await install(new Date(2026, 8, 26, 14, 30, 12));
    clock = new Date(2026, 8, 26, 15, 0, 0);

    const result = await restoreCommand({ version: '20260926-143012', dryRun: false }, context());

    expect(read('.zshrc')).toBe('ZSH_THEME="robbyrussell"\n');
    expect(read('.antigenrc')).toBeUndefined();
    expect(result).toMatchObject({ dryRun: false, snapshot: '20260926-150000', summary: { restored: 1, removed: 1, failed: 0 } });
  });

  test('install tells which backup version holds the files it replaced', async () => {
    await install(new Date(2026, 8, 26, 14, 30, 12));

    expect(reporter.messages('info')).toContain(
      'Replaced files kept in backup 20260926-143012: 0xshell restore 20260926-143012',
    );
  });

  test('is undone by restoring the snapshot it reports', async () => {
    await install(new Date(2026, 8, 26, 14, 30, 12));
    clock = new Date(2026, 8, 26, 15, 0, 0);
    await restoreCommand({ version: '20260926-143012', dryRun: false }, context());
    clock = new Date(2026, 8, 26, 15, 5, 0);

    await restoreCommand({ version: '20260926-150000', dryRun: false }, context());

    expect(read('.zshrc')).toBe('ZSH_THEME="gruvbox"\n');
    expect(read('.antigenrc')).toBe('antigen apply\n');
  });

  test('can restore the same version more than once', async () => {
    await install(new Date(2026, 8, 26, 14, 30, 12));
    clock = new Date(2026, 8, 26, 15, 0, 0);
    await restoreCommand({ version: '20260926-143012', dryRun: false }, context());
    await install(new Date(2026, 8, 26, 15, 1, 0));
    clock = new Date(2026, 8, 26, 15, 2, 0);

    await restoreCommand({ version: '20260926-143012', dryRun: false }, context());

    expect(read('.zshrc')).toBe('ZSH_THEME="robbyrussell"\n');
  });

  test('--dry-run lists what would change and touches nothing', async () => {
    await install(new Date(2026, 8, 26, 14, 30, 12));
    clock = new Date(2026, 8, 26, 15, 0, 0);

    await restoreCommand({ version: '20260926-143012', dryRun: true }, context());

    expect(reporter.messages('line')).toEqual([
      '↺ ~/.zshrc: back to the backup content\n✗ ~/.antigenrc: removed (did not exist)',
    ]);
    expect(read('.zshrc')).toBe('ZSH_THEME="gruvbox"\n');
    expect(existsSync(join(home, '.0xshell', 'backups', '20260926-150000'))).toBe(false);
  });

  test('without a version, restores nothing and lists the backups newest first', async () => {
    await install(new Date(2026, 8, 26, 14, 30, 12));
    writeFileSync(join(home, '.zshrc'), 'edited again\n');
    await install(new Date(2026, 8, 27, 9, 0, 0));

    const rejected = restoreCommand({ dryRun: false }, context());

    await expect(rejected).rejects.toBeInstanceOf(CliError);
    await expect(rejected).rejects.toThrow('Available backups (newest first):\n  20260927-090000\n  20260926-143012');
    expect(read('.zshrc')).toBe('ZSH_THEME="gruvbox"\n');
  });

  test('an unknown version is a usage error that says there are no backups yet', async () => {
    const rejected = restoreCommand({ version: '20200101-000000', dryRun: false }, context());

    await expect(rejected).rejects.toThrow('Backup 20200101-000000 does not exist.\nNo backups in ~/.0xshell/backups.');
  });

  test('a path whose saved copy is gone fails on its own and the rest is still restored', async () => {
    await install(new Date(2026, 8, 26, 14, 30, 12));
    rmSync(join(home, '.0xshell', 'backups', '20260926-143012', 'files', '.zshrc'));
    clock = new Date(2026, 8, 26, 15, 0, 0);

    const result = await restoreCommand({ version: '20260926-143012', dryRun: false }, context());

    expect(result).toMatchObject({ summary: { restored: 0, removed: 1, failed: 1 } });
    expect(read('.antigenrc')).toBeUndefined();
  });

  test('refuses to snapshot into the backup it is restoring from', async () => {
    await install(new Date(2026, 8, 26, 14, 30, 12));

    const rejected = restoreCommand({ version: '20260926-143012', dryRun: false }, context());

    await expect(rejected).rejects.toThrow('was just created');
    expect(read('.zshrc')).toBe('ZSH_THEME="gruvbox"\n');
  });
});
