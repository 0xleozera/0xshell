import { describe, expect, test } from 'bun:test';
import { isUnsupported, unsupported } from './unsupported';

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
