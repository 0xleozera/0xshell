import { describe, expect, test } from 'bun:test';
import { aptGetInstall, aptGetRemove, aptGetUpdate } from './apt-get';

const prefix = ['sudo', 'env', 'DEBIAN_FRONTEND=noninteractive', 'apt-get', '-o', 'DPkg::Lock::Timeout=600'];

describe('apt-get', () => {
  test('install runs non-interactively under sudo and waits for the dpkg lock', () => {
    expect(aptGetInstall('zsh', 'git')).toEqual([...prefix, 'install', '-y', 'zsh', 'git']);
  });

  test('remove takes orphaned dependencies along, and never purges (ADR-0001)', () => {
    expect(aptGetRemove('zsh')).toEqual([...prefix, 'remove', '--autoremove', '-y', 'zsh']);
  });

  test('update', () => {
    expect(aptGetUpdate()).toEqual([...prefix, 'update']);
  });
});
