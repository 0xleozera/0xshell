import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../runner/mock-runner';
import { aptRepo } from './apt-repo';

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
    const runner = new MockRunner();

    await aptRepo(options).install(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'mkdir', '-p', '/etc/apt/keyrings'],
      ['sudo', 'sh', '-c', `curl -fsSL ${options.keyUrl} | gpg --dearmor -o /etc/apt/keyrings/slack.gpg`],
      [
        'sudo',
        'sh',
        '-c',
        'echo "deb [signed-by=/etc/apt/keyrings/slack.gpg] https://packagecloud.io/slacktechnologies/slack/debian/ jessie main" > /etc/apt/sources.list.d/slack.list',
      ],
      ['sudo', 'apt', 'update'],
      ['sudo', 'apt', 'install', '-y', options.packageName],
    ]);
  });

  test('install() writes a source line signed by the imported keyring, never apt-key', async () => {
    const runner = new MockRunner();

    await aptRepo(options).install(runner);

    const sourceLineCommand = runner.commands[2];
    expect(sourceLineCommand?.[3]).toContain('signed-by=/etc/apt/keyrings/slack.gpg');
    expect(runner.commands.some((command) => command.includes('apt-key'))).toBe(false);
  });

  test('install() imports the key and writes the source before running apt update', async () => {
    const runner = new MockRunner();

    await aptRepo(options).install(runner);

    const updateIndex = runner.commands.findIndex(
      (command) => command[0] === 'sudo' && command[1] === 'apt' && command[2] === 'update',
    );
    const keyImportIndex = runner.commands.findIndex((command) => command[2] === '-c' && command[3]?.includes('gpg --dearmor'));
    const sourceWriteIndex = runner.commands.findIndex((command) => command[2] === '-c' && command[3]?.includes('sources.list.d'));

    expect(keyImportIndex).toBeGreaterThanOrEqual(0);
    expect(sourceWriteIndex).toBeGreaterThan(keyImportIndex);
    expect(updateIndex).toBeGreaterThan(sourceWriteIndex);
  });

  test('uninstall() runs sudo apt remove -y <package>', async () => {
    const runner = new MockRunner();

    await aptRepo(options).uninstall(runner);

    expect(runner.wasRun(['sudo', 'apt', 'remove', '-y', options.packageName])).toBe(true);
  });

  test('isInstalled() reflects the exit code of dpkg -s <package> without sudo', async () => {
    const runner = new MockRunner();
    runner.respondTo(['dpkg', '-s', options.packageName], { exitCode: 0 });

    expect(await aptRepo(options).isInstalled(runner)).toBe(true);
    expect(runner.commands.some((command) => command.includes('sudo'))).toBe(false);
  });

  test('isInstalled() is false when dpkg -s <package> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['dpkg', '-s', options.packageName]);

    expect(await aptRepo(options).isInstalled(runner)).toBe(false);
  });

  test('install() rejects when the key import fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['sudo', 'sh', '-c', `curl -fsSL ${options.keyUrl} | gpg --dearmor -o /etc/apt/keyrings/slack.gpg`]);

    await expect(aptRepo(options).install(runner)).rejects.toThrow();
  });

  test('install() rejects when apt install -y <package> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['sudo', 'apt', 'install', '-y', options.packageName]);

    await expect(aptRepo(options).install(runner)).rejects.toThrow();
  });

  test('uninstall() rejects when apt remove -y <package> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['sudo', 'apt', 'remove', '-y', options.packageName]);

    await expect(aptRepo(options).uninstall(runner)).rejects.toThrow();
  });
});
