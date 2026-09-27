import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import { aptRepo } from './apt-repo';
import { aptGetInstall, aptGetRemove, aptGetUpdate } from './apt-get';

const options = {
  repoName: 'slack',
  keyUrl: 'https://packagecloud.io/slacktechnologies/slack/gpgkey',
  repoUrl: 'https://packagecloud.io/slacktechnologies/slack/debian/',
  distribution: 'jessie',
  components: 'main',
  packageName: 'slack-desktop',
};

describe('aptRepo', () => {
  test('declares that it requires privilege', () => {
    expect(aptRepo(options).requiresPrivilege).toBe(true);
  });

  test('install() imports the signing key into its own keyring before apt update, all under sudo', async () => {
    const runner = createMockRunner();

    await aptRepo(options).install(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'mkdir', '-p', '/etc/apt/keyrings'],
      ['sudo', 'sh', '-c', `curl -fsSL "${options.keyUrl}" | gpg --batch --yes --dearmor -o /etc/apt/keyrings/slack.gpg`],
      [
        'sudo',
        'sh',
        '-c',
        'echo "deb [signed-by=/etc/apt/keyrings/slack.gpg] https://packagecloud.io/slacktechnologies/slack/debian/ jessie main" > /etc/apt/sources.list.d/slack.list',
      ],
      aptGetUpdate(),
      aptGetInstall(options.packageName),
    ]);
  });

  test('install() writes a source line signed by the imported keyring, never apt-key', async () => {
    const runner = createMockRunner();

    await aptRepo(options).install(runner);

    const sourceLineCommand = runner.commands[2];
    expect(sourceLineCommand?.[3]).toContain('signed-by=/etc/apt/keyrings/slack.gpg');
    expect(runner.commands.some((command) => command.includes('apt-key'))).toBe(false);
  });

  test('install() imports the key and writes the source before running apt update', async () => {
    const runner = createMockRunner();

    await aptRepo(options).install(runner);

    const updateIndex = runner.commands.findIndex(
      (command) => command.includes('apt-get') && command.at(-1) === 'update',
    );
    const keyImportIndex = runner.commands.findIndex((command) => command[2] === '-c' && command[3]?.includes('--dearmor'));
    const sourceWriteIndex = runner.commands.findIndex((command) => command[2] === '-c' && command[3]?.includes('sources.list.d'));

    expect(keyImportIndex).toBeGreaterThanOrEqual(0);
    expect(sourceWriteIndex).toBeGreaterThan(keyImportIndex);
    expect(updateIndex).toBeGreaterThan(sourceWriteIndex);
  });

  test('uninstall() removes the package, then its source and keyring', async () => {
    const runner = createMockRunner();

    await aptRepo(options).uninstall(runner);

    expect(runner.commands).toEqual([
      aptGetRemove(options.packageName),
      ['sudo', 'rm', '-f', '/etc/apt/sources.list.d/slack.list', '/etc/apt/keyrings/slack.gpg'],
    ]);
  });

  test('uninstall() also removes the leftovers the package writes on its own, globs included', async () => {
    const runner = createMockRunner();

    await aptRepo({ ...options, leftovers: ['/etc/cron.daily/slack', '/etc/apt/trusted.gpg.d/slack-*.gpg'] }).uninstall(
      runner,
    );

    expect(runner.commands.at(-1)).toEqual([
      'sudo',
      'sh',
      '-c',
      'rm -rf /etc/cron.daily/slack /etc/apt/trusted.gpg.d/slack-*.gpg',
    ]);
  });

  test('install() clears stale leftovers before writing its own source', async () => {
    const runner = createMockRunner();

    await aptRepo({ ...options, leftovers: ['/etc/apt/sources.list.d/slack.sources'] }).install(runner);

    expect(runner.commands[0]).toEqual(['sudo', 'sh', '-c', 'rm -rf /etc/apt/sources.list.d/slack.sources']);
  });

  test('install() without leftovers starts with the keyring directory', async () => {
    const runner = createMockRunner();

    await aptRepo(options).install(runner);

    expect(runner.commands[0]).toEqual(['sudo', 'mkdir', '-p', '/etc/apt/keyrings']);
  });

  test('install() takes the source back out when apt cannot use it, then fails', async () => {
    const runner = createMockRunner();
    runner.failOn(aptGetUpdate());

    await expect(aptRepo(options).install(runner)).rejects.toThrow();
    expect(runner.commands.at(-1)).toEqual([
      'sudo',
      'rm',
      '-f',
      '/etc/apt/sources.list.d/slack.list',
      '/etc/apt/keyrings/slack.gpg',
    ]);
  });

  test('isInstalled() is false for a package removed but not purged', async () => {
    const runner = createMockRunner();
    runner.respondTo(['dpkg-query', '-W', '-f=${Status}', options.packageName], {
      exitCode: 0,
      stdout: 'deinstall ok config-files',
    });

    expect(await aptRepo(options).isInstalled(runner)).toBe(false);
  });

  test('isInstalled() reflects the exit code of dpkg -s <package> without sudo', async () => {
    const runner = createMockRunner();
    runner.respondTo(['dpkg-query', '-W', '-f=${Status}', options.packageName], { exitCode: 0, stdout: 'install ok installed' });

    expect(await aptRepo(options).isInstalled(runner)).toBe(true);
    expect(runner.commands.some((command) => command.includes('sudo'))).toBe(false);
  });

  test('isInstalled() is false when dpkg -s <package> fails', async () => {
    const runner = createMockRunner();
    runner.failOn(['dpkg-query', '-W', '-f=${Status}', options.packageName]);

    expect(await aptRepo(options).isInstalled(runner)).toBe(false);
  });

  test('install() rejects when the key import fails', async () => {
    const runner = createMockRunner();
    runner.failOn(['sudo', 'sh', '-c', `curl -fsSL "${options.keyUrl}" | gpg --batch --yes --dearmor -o /etc/apt/keyrings/slack.gpg`]);

    await expect(aptRepo(options).install(runner)).rejects.toThrow();
  });

  test('install() rejects when apt install -y <package> fails', async () => {
    const runner = createMockRunner();
    runner.failOn(aptGetInstall(options.packageName));

    await expect(aptRepo(options).install(runner)).rejects.toThrow();
  });

  test('uninstall() rejects when apt remove -y <package> fails', async () => {
    const runner = createMockRunner();
    runner.failOn(aptGetRemove(options.packageName));

    await expect(aptRepo(options).uninstall(runner)).rejects.toThrow();
  });
});
