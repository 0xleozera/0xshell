import { describe, expect, test } from 'bun:test';
import { brewCask } from '../helpers/brew-cask';
import { defineTool, type Tool } from './define-tool';
import { unsupported } from './unsupported';

describe('defineTool', () => {
  test('accepts a valid Tool definition', () => {
    const tool = defineTool({
      id: 'slack',
      stage: 3,
      darwin: brewCask('slack'),
      linux: unsupported('sem receita Linux ainda'),
    });

    expect(tool.id).toBe('slack');
  });

  test('accepts unsupported() as a Plataforma recipe', () => {
    const tool = defineTool({
      id: 'xcode',
      stage: 3,
      darwin: brewCask('xcode'),
      linux: unsupported('ferramenta exclusiva da Apple'),
    });

    expect(tool.linux).toEqual({ unsupported: true, reason: 'ferramenta exclusiva da Apple' });
  });

  test('rejects a Tool with an empty id', () => {
    const invalid = {
      id: '',
      stage: 3,
      darwin: brewCask('slack'),
      linux: unsupported('motivo'),
    } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool missing darwin recipe', () => {
    const invalid = { id: 'slack', stage: 3, linux: unsupported('motivo') } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool missing linux recipe', () => {
    const invalid = { id: 'slack', stage: 3, darwin: brewCask('slack') } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool whose darwin is not a Recipe nor Unsupported', () => {
    const invalid = {
      id: 'slack',
      stage: 3,
      darwin: { install: 'not-a-function' },
      linux: unsupported('motivo'),
    } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool missing stage', () => {
    const invalid = {
      id: 'slack',
      darwin: brewCask('slack'),
      linux: unsupported('motivo'),
    } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool with a stage outside 0–3', () => {
    const invalid = {
      id: 'slack',
      stage: 4,
      darwin: brewCask('slack'),
      linux: unsupported('motivo'),
    } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool with a non-integer stage', () => {
    const invalid = {
      id: 'slack',
      stage: 1.5,
      darwin: brewCask('slack'),
      linux: unsupported('motivo'),
    } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });
});
