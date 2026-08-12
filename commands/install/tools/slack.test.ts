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

  test('linux produces the exact apt repo install commands', async () => {
    const runner = new MockRunner();

    await slack.linux.install(runner);

    expect(runner.commands).toEqual([
      ['add-apt-repository', '-y', 'deb https://packagecloud.io/slacktechnologies/slack/debian/ jessie main'],
      ['apt', 'update'],
      ['apt', 'install', '-y', 'slack-desktop'],
    ]);
  });
});
