import { describe, expect, test } from 'bun:test';
import { aptGetInstall } from '../helpers/apt-get';
import { createMockRunner } from '../mock-runner';
import bruno from './bruno';

describe('bruno tool', () => {
  test('darwin installs the brew cask', async () => {
    const runner = createMockRunner();

    await bruno.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'bruno']]);
  });

  test('linux imports the key from the Ubuntu keyserver, quoted, and installs from Bruno\'s repository', async () => {
    const runner = createMockRunner();

    await bruno.linux.install(runner);

    expect(runner.commands).toContainEqual([
      'sudo',
      'sh',
      '-c',
      'curl -fsSL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x9FA6017ECABE0266" | gpg --batch --yes --dearmor -o /etc/apt/keyrings/bruno.gpg',
    ]);
    expect(runner.commands).toContainEqual([
      'sudo',
      'sh',
      '-c',
      'echo "deb [signed-by=/etc/apt/keyrings/bruno.gpg] http://debian.usebruno.com/ bruno stable" > /etc/apt/sources.list.d/bruno.list',
    ]);
    expect(runner.commands.at(-1)).toEqual(aptGetInstall('bruno'));
  });
});
