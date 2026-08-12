import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import dbeaver from './dbeaver';

describe('dbeaver tool', () => {
  test('darwin installs the community cask, not the paid one', async () => {
    const runner = new MockRunner();

    await dbeaver.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'dbeaver-community']]);
  });

  test('linux imports the dbeaver signing key before apt update, then installs dbeaver-ce', async () => {
    const runner = new MockRunner();

    await dbeaver.linux.install(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'mkdir', '-p', '/etc/apt/keyrings'],
      [
        'sudo',
        'sh',
        '-c',
        'curl -fsSL https://dbeaver.io/debs/dbeaver.gpg.key | gpg --dearmor -o /etc/apt/keyrings/dbeaver.gpg',
      ],
      [
        'sudo',
        'sh',
        '-c',
        'echo "deb [signed-by=/etc/apt/keyrings/dbeaver.gpg] https://dbeaver.io/debs/dbeaver-ce / " > /etc/apt/sources.list.d/dbeaver.list',
      ],
      ['sudo', 'apt', 'update'],
      ['sudo', 'apt', 'install', '-y', 'dbeaver-ce'],
    ]);
  });
});
