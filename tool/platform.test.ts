import { describe, expect, test } from 'bun:test';
import { resolvePlatform } from './platform';

describe('resolvePlatform', () => {
  test('resolves darwin', () => {
    expect(resolvePlatform('darwin')).toBe('darwin');
  });

  test('resolves linux', () => {
    expect(resolvePlatform('linux')).toBe('linux');
  });

  test('throws on an unsupported OS platform', () => {
    expect(() => resolvePlatform('win32')).toThrow();
  });

  test('defaults to process.platform when no argument is given', () => {
    expect(['darwin', 'linux']).toContain(resolvePlatform());
  });
});
