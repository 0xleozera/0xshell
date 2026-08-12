import { describe, expect, test } from 'bun:test';
import { brewCask } from '../helpers/brew-cask';
import { defineTool, type Tool } from './define-tool';

describe('defineTool', () => {
  test('accepts a valid Tool definition', () => {
    const tool = defineTool({ id: 'slack', darwin: brewCask('slack') });

    expect(tool.id).toBe('slack');
  });

  test('rejects a Tool with an empty id', () => {
    const invalid = { id: '', darwin: brewCask('slack') } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool missing darwin recipe', () => {
    const invalid = { id: 'slack' } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });

  test('rejects a Tool whose darwin is not a Recipe', () => {
    const invalid = { id: 'slack', darwin: { install: 'not-a-function' } } as unknown as Tool;

    expect(() => defineTool(invalid)).toThrow();
  });
});
