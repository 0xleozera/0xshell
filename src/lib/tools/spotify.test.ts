import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import spotify from './spotify';
import { aptGetInstall, aptGetUpdate } from '../helpers/apt-get';

describe('spotify tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = createMockRunner();

    await spotify.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'spotify']]);
  });

  test('linux clears the package\'s stale sources, imports the spotify signing key before apt update, then installs spotify-client', async () => {
    const runner = createMockRunner();

    await spotify.linux.install(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'sh', '-c', 'rm -rf /etc/apt/trusted.gpg.d/spotify-*.gpg'],
      ['sudo', 'mkdir', '-p', '/etc/apt/keyrings'],
      [
        'sudo',
        'sh',
        '-c',
        'curl -fsSL \"https://download.spotify.com/debian/pubkey_5384CE82BA52C83A.gpg\" | gpg --batch --yes --dearmor -o /etc/apt/keyrings/spotify.gpg',
      ],
      [
        'sudo',
        'sh',
        '-c',
        'echo "deb [signed-by=/etc/apt/keyrings/spotify.gpg] http://repository.spotify.com stable non-free" > /etc/apt/sources.list.d/spotify.list',
      ],
      aptGetUpdate(),
      aptGetInstall('spotify-client'),
    ]);
  });
});
