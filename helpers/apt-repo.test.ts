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
  test('install() imports the signing key into its own keyring before apt update', async () => {
    const runner = new MockRunner();

    await aptRepo(options).install(runner);

    expect(runner.commands).toEqual([
      ['mkdir', '-p', '/etc/apt/keyrings'],
      ['sh', '-c', `curl -fsSL ${options.keyUrl} | gpg --dearmor -o /etc/apt/keyrings/slack.gpg`],
      [
        'sh',
        '-c',
        'echo "deb [signed-by=/etc/apt/keyrings/slack.gpg] https://packagecloud.io/slacktechnologies/slack/debian/ jessie main" > /etc/apt/sources.list.d/slack.list',
      ],
      ['apt', 'update'],
      ['apt', 'install', '-y', options.packageName],
    ]);
  });

  test('install() writes a source line signed by the imported keyring, never apt-key', async () => {
    const runner = new MockRunner();

    await aptRepo(options).install(runner);

    const sourceLineCommand = runner.commands[2];
    expect(sourceLineCommand?.[2]).toContain('signed-by=/etc/apt/keyrings/slack.gpg');
    expect(runner.commands.some((command) => command[0] === 'apt-key')).toBe(false);
  });

  test('install() imports the key and writes the source before running apt update', async () => {
    const runner = new MockRunner();

    await aptRepo(options).install(runner);

    const updateIndex = runner.commands.findIndex(
      (command) => command[0] === 'apt' && command[1] === 'update',
    );
    const keyImportIndex = runner.commands.findIndex((command) => command[1] === '-c' && command[2]?.includes('gpg --dearmor'));
    const sourceWriteIndex = runner.commands.findIndex((command) => command[1] === '-c' && command[2]?.includes('sources.list.d'));

    expect(keyImportIndex).toBeGreaterThanOrEqual(0);
    expect(sourceWriteIndex).toBeGreaterThan(keyImportIndex);
    expect(updateIndex).toBeGreaterThan(sourceWriteIndex);
  });

  test('uninstall() runs apt remove -y <package>', async () => {
    const runner = new MockRunner();

    await aptRepo(options).uninstall(runner);

    expect(runner.wasRun(['apt', 'remove', '-y', options.packageName])).toBe(true);
  });

  test('isInstalled() reflects the exit code of dpkg -s <package>', async () => {
    const runner = new MockRunner();
    runner.respondTo(['dpkg', '-s', options.packageName], { exitCode: 0 });

    expect(await aptRepo(options).isInstalled(runner)).toBe(true);
  });

  test('isInstalled() is false when dpkg -s <package> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['dpkg', '-s', options.packageName]);

    expect(await aptRepo(options).isInstalled(runner)).toBe(false);
  });
});
