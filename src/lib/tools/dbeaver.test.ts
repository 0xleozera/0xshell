import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import dbeaver from './dbeaver';
import { aptGetInstall, aptGetUpdate } from '../helpers/apt-get';

describe('dbeaver tool', () => {
  test('darwin installs the community cask, not the paid one', async () => {
    const runner = createMockRunner();

    await dbeaver.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'dbeaver-community']]);
  });

  test('linux imports the dbeaver signing key before apt update, then installs dbeaver-ce', async () => {
    const runner = createMockRunner();

    await dbeaver.linux.install(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'mkdir', '-p', '/etc/apt/keyrings'],
      [
        'sudo',
        'sh',
        '-c',
        'curl -fsSL https://dbeaver.io/debs/dbeaver.gpg.key | gpg --batch --yes --dearmor -o /etc/apt/keyrings/dbeaver.gpg',
      ],
      [
        'sudo',
        'sh',
        '-c',
        'echo "deb [signed-by=/etc/apt/keyrings/dbeaver.gpg] https://dbeaver.io/debs/dbeaver-ce /" > /etc/apt/sources.list.d/dbeaver.list',
      ],
      aptGetUpdate(),
      aptGetInstall('dbeaver-ce'),
    ]);
  });
});
