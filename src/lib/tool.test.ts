import { describe, expect, test } from 'bun:test';
import { aptRepo } from './helpers/apt-repo';
import { brewCask } from './helpers/brew-cask';
import { defineTool, isUnsupported, resolveForPlatform, unsupported, type Tool } from './tool';

describe('defineTool', () => {
  test('accepts a valid Tool definition', () => {
    const tool = defineTool({
      id: 'slack',
      stage: 3,
      tags: ['apps'],
      darwin: brewCask('slack'),
      linux: unsupported('sem receita Linux ainda'),
    });

    expect(tool.id).toBe('slack');
  });

  test('accepts unsupported() as a Plataforma recipe', () => {
    const tool = defineTool({
      id: 'xcode',
      stage: 3,
      tags: ['apps'],
      darwin: brewCask('xcode'),
      linux: unsupported('ferramenta exclusiva da Apple'),
    });

    expect(tool.linux).toEqual({ unsupported: true, reason: 'ferramenta exclusiva da Apple' });
  });

  test('accepts an empty tags array', () => {
    const tool = defineTool({
      id: 'slack',
      stage: 3,
      tags: [],
      darwin: brewCask('slack'),
      linux: unsupported('motivo'),
    });

    expect(tool.tags).toEqual([]);
  });

  test('rejects a Tool with an empty id', () => {
    const invalid = {
      id: '',
      stage: 3,
      tags: [],
      darwin: brewCask('slack'),
      linux: unsupported('motivo'),
    } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool missing darwin recipe', () => {
    const invalid = { id: 'slack', stage: 3, tags: [], linux: unsupported('motivo') } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool missing linux recipe', () => {
    const invalid = { id: 'slack', stage: 3, tags: [], darwin: brewCask('slack') } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool whose darwin is not a Recipe nor Unsupported', () => {
    const invalid = {
      id: 'slack',
      stage: 3,
      tags: [],
      darwin: { install: 'not-a-function' },
      linux: unsupported('motivo'),
    } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool missing stage', () => {
    const invalid = {
      id: 'slack',
      tags: [],
      darwin: brewCask('slack'),
      linux: unsupported('motivo'),
    } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool with a stage outside 0–3', () => {
    const invalid = {
      id: 'slack',
      stage: 4,
      tags: [],
      darwin: brewCask('slack'),
      linux: unsupported('motivo'),
    } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool with a non-integer stage', () => {
    const invalid = {
      id: 'slack',
      stage: 1.5,
      tags: [],
      darwin: brewCask('slack'),
      linux: unsupported('motivo'),
    } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool with a non-string tag', () => {
    const invalid = {
      id: 'slack',
      stage: 3,
      tags: [1],
      darwin: brewCask('slack'),
      linux: unsupported('motivo'),
    } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });
});

describe('unsupported', () => {
  test('carries the given reason', () => {
    const entry = unsupported('sem cliente Linux oficial');

    expect(entry).toEqual({ unsupported: true, reason: 'sem cliente Linux oficial' });
  });
});

describe('isUnsupported', () => {
  test('is true for an Unsupported value', () => {
    expect(isUnsupported(unsupported('motivo'))).toBe(true);
  });

  test('is false for a Recipe-shaped value', () => {
    const recipe = { install: () => {}, uninstall: () => {}, isInstalled: () => {} };

    expect(isUnsupported(recipe)).toBe(false);
  });

  test('is false for a value with an empty reason', () => {
    expect(isUnsupported({ unsupported: true, reason: '' })).toBe(false);
  });

  test('is false for non-object values', () => {
    expect(isUnsupported(null)).toBe(false);
    expect(isUnsupported('unsupported')).toBe(false);
  });
});

describe('resolveForPlatform', () => {
  test('resolves the darwin recipe on darwin and the linux recipe on linux', () => {
    const tool = defineTool({
      id: 'slack',
      stage: 3,
      tags: ['apps'],
      darwin: brewCask('slack'),
      linux: aptRepo({
        repoName: 'slack',
        keyUrl: 'https://packagecloud.io/slacktechnologies/slack/gpgkey',
        repoUrl: 'https://packagecloud.io/slacktechnologies/slack/debian/',
        distribution: 'jessie',
        components: 'main',
        packageName: 'slack-desktop',
      }),
    });

    expect(resolveForPlatform(tool, 'darwin')).toBe(tool.darwin);
    expect(resolveForPlatform(tool, 'linux')).toBe(tool.linux);
  });

  test('resolves to Unsupported with the reason preserved', () => {
    const tool = defineTool({
      id: 'xcode',
      stage: 3,
      tags: ['apps'],
      darwin: brewCask('xcode'),
      linux: unsupported('ferramenta exclusiva da Apple'),
    });

    const entry = resolveForPlatform(tool, 'linux');

    expect(isUnsupported(entry)).toBe(true);
    expect(entry).toEqual({ unsupported: true, reason: 'ferramenta exclusiva da Apple' });
  });
});
