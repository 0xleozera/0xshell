import { describe, expect, test } from 'bun:test';
import { backupVersion, parseManifest, savedCopyPath } from './backup';

describe('backupVersion', () => {
  test('names a version by local date and time, zero-padded so versions sort as text', () => {
    expect(backupVersion(new Date(2026, 0, 5, 9, 3, 7))).toBe('20260105-090307');
  });
});

describe('savedCopyPath', () => {
  const backup = { home: '/home/leo', version: '20260926-143012' };

  test('mirrors the path relative to the home under the version directory', () => {
    expect(savedCopyPath(backup, '/home/leo/.config/nvim')).toBe(
      '/home/leo/.0xshell/backups/20260926-143012/files/.config/nvim',
    );
  });

  test('refuses a path outside the home instead of writing outside the backup', () => {
    expect(() => savedCopyPath(backup, '/etc/zshrc')).toThrow('outside the home');
  });
});

describe('parseManifest', () => {
  test('reads one entry per line, in the order they were recorded', () => {
    expect(parseManifest('saved\t/home/leo/.zshrc\ncreated\t/home/leo/.antigenrc\n')).toEqual([
      { kind: 'saved', path: '/home/leo/.zshrc' },
      { kind: 'created', path: '/home/leo/.antigenrc' },
    ]);
  });

  test('rejects a line it does not understand rather than restoring a guess', () => {
    expect(() => parseManifest('moved\t/home/leo/.zshrc\n')).toThrow('invalid line');
  });
});
