import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import spotify from './spotify';

describe('spotify tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = new MockRunner();

    await spotify.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'spotify']]);
  });

  test('linux imports the spotify signing key before apt update, then installs spotify-client', async () => {
    const runner = new MockRunner();

    await spotify.linux.install(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'mkdir', '-p', '/etc/apt/keyrings'],
      [
        'sudo',
        'sh',
        '-c',
        'curl -fsSL https://download.spotify.com/debian/pubkey_C85668DF69375001.gpg | gpg --dearmor -o /etc/apt/keyrings/spotify.gpg',
      ],
      [
        'sudo',
        'sh',
        '-c',
        'echo "deb [signed-by=/etc/apt/keyrings/spotify.gpg] http://repository.spotify.com stable non-free" > /etc/apt/sources.list.d/spotify.list',
      ],
      ['sudo', 'apt', 'update'],
      ['sudo', 'apt', 'install', '-y', 'spotify-client'],
    ]);
  });
});
