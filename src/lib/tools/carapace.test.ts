import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import carapace from './carapace';

describe('carapace tool', () => {
  test('darwin installs the brew formula', async () => {
    const runner = createMockRunner();

    await carapace.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', 'carapace']]);
  });

  test('linux adds the fury repository, then installs carapace-bin', async () => {
    const runner = createMockRunner();

    await carapace.linux.install(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'sh', '-c', 'echo "deb [trusted=yes] https://apt.fury.io/rsteube/ /" > /etc/apt/sources.list.d/fury.list'],
      ['sudo', 'apt', 'update'],
      ['sudo', 'apt', 'install', '-y', 'carapace-bin'],
    ]);
  });

  test('linux requires privilege', () => {
    expect(carapace.linux.requiresPrivilege).toBe(true);
  });
});
