import { describe, expect, test } from 'bun:test';
import { CliError } from '../lib/errors';
import { defineTool, unsupported, type Tool } from '../lib/tool';
import { askToolsToInstall, confirmUninstallAll } from './tools';

function tool(id: string): Tool {
  return defineTool({ id, stage: 3, tags: [], darwin: unsupported('teste'), linux: unsupported('teste') });
}

describe('askToolsToInstall', () => {
  test('returns exactly the Tools whose ids were marked', async () => {
    const catalog = [tool('slack'), tool('neovim'), tool('docker')];
    const fakePrompt = async () => ['neovim', 'docker'];

    const selected = await askToolsToInstall(catalog, fakePrompt);

    expect(selected.map((t) => t.id)).toEqual(['neovim', 'docker']);
  });

  test('passes the whole catalog as options, by id', async () => {
    const catalog = [tool('slack'), tool('neovim')];
    let seenOptions: { value: string; label: string }[] = [];
    const fakePrompt = async (opts: { options: { value: string; label: string }[] }) => {
      seenOptions = opts.options;
      return [];
    };

    await askToolsToInstall(catalog, fakePrompt);

    expect(seenOptions).toEqual([
      { value: 'slack', label: 'slack' },
      { value: 'neovim', label: 'neovim' },
    ]);
  });

  test('a cancelled prompt is reported as cancelled, not as an empty selection', async () => {
    const fakePrompt = async () => Symbol('cancel');

    const rejected = askToolsToInstall([tool('slack')], fakePrompt);

    await expect(rejected).rejects.toThrow(CliError);
    await expect(rejected).rejects.toThrow('Instalação cancelada.');
  });
});

describe('confirmUninstallAll', () => {
  test('returns true when the prompt is confirmed', async () => {
    const fakePrompt = async () => true;

    expect(await confirmUninstallAll(undefined, fakePrompt)).toBe(true);
  });

  test('returns false when the prompt is declined', async () => {
    const fakePrompt = async () => false;

    expect(await confirmUninstallAll(undefined, fakePrompt)).toBe(false);
  });

  test('a cancelled prompt is reported as cancelled, so the shell can tell it from a "no"', async () => {
    const fakePrompt = async () => Symbol('cancel');

    const rejected = confirmUninstallAll(undefined, fakePrompt);

    await expect(rejected).rejects.toThrow(CliError);
    await expect(rejected).rejects.toThrow('Desinstalação cancelada.');
  });

  test('passes the given message through to the prompt', async () => {
    let seenMessage = '';
    const fakePrompt = async (opts: { message: string }) => {
      seenMessage = opts.message;
      return true;
    };

    await confirmUninstallAll('desinstalar tudo?', fakePrompt);

    expect(seenMessage).toBe('desinstalar tudo?');
  });
});
