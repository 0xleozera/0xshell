import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import git from './git';

describe('git tool', () => {
  test('darwin installs the brew formula, not the Apple git', async () => {
    const runner = createMockRunner();

    await git.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', 'git']]);
  });

  test('linux installs the apt package', async () => {
    const runner = createMockRunner();

    await git.linux.install(runner);

    expect(runner.commands).toEqual([['sudo', 'apt', 'install', '-y', 'git']]);
  });

  test('linux declares that it needs privilege', () => {
    expect(git.linux.requiresPrivilege).toBe(true);
  });
});
