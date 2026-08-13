import { describe, expect, test } from 'bun:test';
import { defineTool, type Tool } from '../../tool/define-tool';
import { unsupported } from '../../tool/unsupported';
import { promptTools } from './prompt-tools';

function tool(id: string): Tool {
  return defineTool({ id, stage: 3, tags: [], darwin: unsupported('teste'), linux: unsupported('teste') });
}

describe('promptTools', () => {
  test('returns exactly the Tools whose ids were marked', async () => {
    const catalog = [tool('slack'), tool('neovim'), tool('docker')];
    const fakePrompt = async () => ['neovim', 'docker'];

    const selected = await promptTools(catalog, fakePrompt);

    expect(selected.map((t) => t.id)).toEqual(['neovim', 'docker']);
  });

  test('passes the whole catalog as options, by id', async () => {
    const catalog = [tool('slack'), tool('neovim')];
    let seenOptions: { value: string; label: string }[] = [];
    const fakePrompt = async (opts: { options: { value: string; label: string }[] }) => {
      seenOptions = opts.options;
      return [];
    };

    await promptTools(catalog, fakePrompt);

    expect(seenOptions).toEqual([
      { value: 'slack', label: 'slack' },
      { value: 'neovim', label: 'neovim' },
    ]);
  });

  test('returns an empty list without throwing when the prompt is cancelled', async () => {
    const catalog = [tool('slack')];
    const fakePrompt = async () => Symbol('cancel');

    const selected = await promptTools(catalog, fakePrompt);

    expect(selected).toEqual([]);
  });
});
