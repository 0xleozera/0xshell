import { describe, expect, test } from 'bun:test';
import { aptGetInstall, aptGetRemove } from '../helpers/apt-get';
import { createMockRunner } from '../mock-runner';
import gh from './gh';

describe('gh tool', () => {
  test('darwin installs the brew formula', async () => {
    const runner = createMockRunner();

    await gh.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', 'gh']]);
  });

  test('linux installs from GitHub\'s own signed repository, not the Ubuntu archive', async () => {
    const runner = createMockRunner();

    await gh.linux.install(runner);

    expect(runner.commands).toContainEqual([
      'sudo',
      'sh',
      '-c',
      'echo "deb [signed-by=/etc/apt/keyrings/github-cli.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list',
    ]);
    expect(runner.commands.at(-1)).toEqual(aptGetInstall('gh'));
  });

  test('linux uninstall removes gh, then the repository', async () => {
    const runner = createMockRunner();

    await gh.linux.uninstall(runner);

    expect(runner.commands).toEqual([
      aptGetRemove('gh'),
      ['sudo', 'rm', '-f', '/etc/apt/sources.list.d/github-cli.list', '/etc/apt/keyrings/github-cli.gpg'],
    ]);
  });
});
