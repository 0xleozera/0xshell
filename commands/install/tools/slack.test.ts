import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import slack from './slack';

describe('slack tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = new MockRunner();

    await slack.darwin.install(runner);

    // This is the test that catches a typo'd cask name.
    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'slack']]);
  });

  test('linux imports the packagecloud signing key before apt update, then installs slack-desktop', async () => {
    const runner = new MockRunner();

    await slack.linux.install(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'mkdir', '-p', '/etc/apt/keyrings'],
      [
        'sudo',
        'sh',
        '-c',
        'curl -fsSL https://packagecloud.io/slacktechnologies/slack/gpgkey | gpg --dearmor -o /etc/apt/keyrings/slack.gpg',
      ],
      [
        'sudo',
        'sh',
        '-c',
        'echo "deb [signed-by=/etc/apt/keyrings/slack.gpg] https://packagecloud.io/slacktechnologies/slack/debian/ jessie main" > /etc/apt/sources.list.d/slack.list',
      ],
      ['sudo', 'apt', 'update'],
      ['sudo', 'apt', 'install', '-y', 'slack-desktop'],
    ]);
  });
});
