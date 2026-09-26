import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import { aptGetInstall, aptGetRemove } from './apt-get';
import { deb, debFromUrl } from './deb';

const options = { packageName: 'discord', download: debFromUrl('https://example.com/download?format=deb&os=linux') };
const debPath = '/tmp/0xshell-discord.deb';

describe('deb', () => {
  test('declares that it requires privilege', () => {
    expect(deb(options).requiresPrivilege).toBe(true);
  });

  test('install() downloads the .deb to a path passed as $1, installs it with apt, then removes it', async () => {
    const runner = createMockRunner();

    await deb(options).install(runner);

    expect(runner.commands).toEqual([
      ['sh', '-c', 'set -eu; curl -fsSL "https://example.com/download?format=deb&os=linux" -o "$1"', 'sh', debPath],
      aptGetInstall(debPath),
      ['rm', '-f', debPath],
    ]);
  });

  test('install() removes the download and rejects when apt fails', async () => {
    const runner = createMockRunner();
    runner.failOn(aptGetInstall(debPath));

    await expect(deb(options).install(runner)).rejects.toThrow();
    expect(runner.commands.at(-1)).toEqual(['rm', '-f', debPath]);
  });

  test('install() never reaches apt when the download fails', async () => {
    const runner = createMockRunner();
    runner.failOn(['sh', '-c', `set -eu; ${options.download}`, 'sh', debPath]);

    await expect(deb(options).install(runner)).rejects.toThrow();
    expect(runner.wasRun(aptGetInstall(debPath))).toBe(false);
  });

  test('uninstall() removes the package', async () => {
    const runner = createMockRunner();

    await deb(options).uninstall(runner);

    expect(runner.commands).toEqual([aptGetRemove('discord')]);
  });

  test('isInstalled() asks dpkg for the package status', async () => {
    const runner = createMockRunner();
    runner.respondTo(['dpkg-query', '-W', '-f=${Status}', 'discord'], { stdout: 'install ok installed' });

    expect(await deb(options).isInstalled(runner)).toBe(true);
  });
});
