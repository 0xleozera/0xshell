import { describe, expect, test } from 'bun:test';
import { defineTool, type Tool } from '../tool/define-tool';
import { unsupported } from '../tool/unsupported';
import { selectTools } from './select-tools';

function tool(id: string, tags: string[] = []): Tool {
  return defineTool({
    id,
    stage: 3,
    tags,
    darwin: unsupported('teste'),
    linux: unsupported('teste'),
  });
}

describe('selectTools', () => {
  test('with no names and no tag, selects the whole catalog', () => {
    const catalog = [tool('slack'), tool('neovim'), tool('docker')];

    const result = selectTools(catalog, () => undefined);

    expect(result).toEqual({ ok: true, tools: catalog });
  });

  test('by name, selects exactly the named Tools via findTool', () => {
    const neovim = tool('neovim');
    const docker = tool('docker');
    const catalog = [tool('slack'), neovim, docker];
    const findTool = (id: string) => catalog.find((t) => t.id === id);

    const result = selectTools(catalog, findTool, { names: ['neovim', 'docker'] });

    expect(result).toEqual({ ok: true, tools: [neovim, docker] });
  });

  test('an unknown name fails the whole selection, with no partial result', () => {
    const catalog = [tool('slack'), tool('neovim')];
    const findTool = (id: string) => catalog.find((t) => t.id === id);

    const result = selectTools(catalog, findTool, { names: ['neovim', 'not-a-real-tool'] });

    expect(result).toEqual({
      ok: false,
      error: 'Ferramenta(s) desconhecida(s) no Catálogo: not-a-real-tool',
    });
  });

  test('by tag, selects exactly the Tools carrying that Tag', () => {
    const slack = tool('slack', ['apps']);
    const neovim = tool('neovim', ['cli']);
    const bun = tool('bun', ['runtimes']);
    const catalog = [slack, neovim, bun];

    const result = selectTools(catalog, () => undefined, { tag: 'apps' });

    expect(result).toEqual({ ok: true, tools: [slack] });
  });

  test('a tag matching nothing selects an empty set, not an error', () => {
    const catalog = [tool('slack', ['apps'])];

    const result = selectTools(catalog, () => undefined, { tag: 'no-such-tag' });

    expect(result).toEqual({ ok: true, tools: [] });
  });

  test('names take priority over tag when both are given', () => {
    const neovim = tool('neovim', ['cli']);
    const catalog = [tool('slack', ['apps']), neovim];
    const findTool = (id: string) => catalog.find((t) => t.id === id);

    const result = selectTools(catalog, findTool, { names: ['neovim'], tag: 'apps' });

    expect(result).toEqual({ ok: true, tools: [neovim] });
  });
});
