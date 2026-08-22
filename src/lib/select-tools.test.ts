import { describe, expect, test } from 'bun:test';
import { CliError } from './errors';
import { selectTools } from './select-tools';
import { defineTool, unsupported, type Tool } from './tool';

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

    expect(selectTools(catalog)).toEqual(catalog);
  });

  test('by name, selects exactly the named Tools', () => {
    const neovim = tool('neovim');
    const docker = tool('docker');
    const catalog = [tool('slack'), neovim, docker];

    expect(selectTools(catalog, { names: ['neovim', 'docker'] })).toEqual([neovim, docker]);
  });

  test('an unknown name fails the whole selection as a usage error, with no partial result', () => {
    const catalog = [tool('slack'), tool('neovim')];

    expect(() => selectTools(catalog, { names: ['neovim', 'not-a-real-tool'] })).toThrow(
      'Ferramenta(s) desconhecida(s) no Catálogo: not-a-real-tool',
    );

    try {
      selectTools(catalog, { names: ['not-a-real-tool'] });
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).code).toBe('usage');
    }
  });

  test('by tag, selects exactly the Tools carrying that Tag', () => {
    const slack = tool('slack', ['apps']);
    const catalog = [slack, tool('neovim', ['cli']), tool('bun', ['runtimes'])];

    expect(selectTools(catalog, { tag: 'apps' })).toEqual([slack]);
  });

  test('a tag matching nothing selects an empty set, not an error', () => {
    const catalog = [tool('slack', ['apps'])];

    expect(selectTools(catalog, { tag: 'no-such-tag' })).toEqual([]);
  });

  test('names take priority over tag when both are given', () => {
    const neovim = tool('neovim', ['cli']);
    const catalog = [tool('slack', ['apps']), neovim];

    expect(selectTools(catalog, { names: ['neovim'], tag: 'apps' })).toEqual([neovim]);
  });
});
