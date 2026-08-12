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
      ['mkdir', '-p', '/etc/apt/keyrings'],
      [
        'sh',
        '-c',
        'curl -fsSL https://packagecloud.io/slacktechnologies/slack/gpgkey | gpg --dearmor -o /etc/apt/keyrings/slack.gpg',
      ],
      [
        'sh',
        '-c',
        'echo "deb [signed-by=/etc/apt/keyrings/slack.gpg] https://packagecloud.io/slacktechnologies/slack/debian/ jessie main" > /etc/apt/sources.list.d/slack.list',
      ],
      ['apt', 'update'],
      ['apt', 'install', '-y', 'slack-desktop'],
    ]);
  });
});
