import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import slack from './slack';
import { aptGetInstall, aptGetUpdate } from '../helpers/apt-get';

describe('slack tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = createMockRunner();

    await slack.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'slack']]);
  });

  test('linux clears the package\'s stale sources, imports the packagecloud signing key before apt update, then installs slack-desktop', async () => {
    const runner = createMockRunner();

    await slack.linux.install(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'sh', '-c', 'rm -rf /etc/cron.daily/slack /etc/default/slack /etc/apt/trusted.gpg.d/slack-desktop.gpg /etc/apt/trusted.gpg.d/packagecloud.gpg'],
      ['sudo', 'mkdir', '-p', '/etc/apt/keyrings'],
      [
        'sudo',
        'sh',
        '-c',
        'curl -fsSL \"https://packagecloud.io/slacktechnologies/slack/gpgkey\" | gpg --batch --yes --dearmor -o /etc/apt/keyrings/slack.gpg',
      ],
      [
        'sudo',
        'sh',
        '-c',
        'echo "deb [signed-by=/etc/apt/keyrings/slack.gpg] https://packagecloud.io/slacktechnologies/slack/debian/ jessie main" > /etc/apt/sources.list.d/slack.list',
      ],
      aptGetUpdate(),
      aptGetInstall('slack-desktop'),
    ]);
  });
});
