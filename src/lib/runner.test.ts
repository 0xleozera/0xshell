import { describe, expect, test } from 'bun:test';
import { withUserBin } from './runner';

describe('withUserBin', () => {
  test('puts ~/.local/bin first when it is missing', () => {
    expect(withUserBin('/usr/bin:/bin', '/home/me')).toBe('/home/me/.local/bin:/usr/bin:/bin');
  });

  test('leaves the PATH alone when ~/.local/bin is already on it', () => {
    expect(withUserBin('/usr/bin:/home/me/.local/bin', '/home/me')).toBe('/usr/bin:/home/me/.local/bin');
  });

  test('works from an empty PATH', () => {
    expect(withUserBin('', '/home/me')).toBe('/home/me/.local/bin');
  });
});
