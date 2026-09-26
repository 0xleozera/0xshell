import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import warp from './warp';
import { aptGetInstall, aptGetUpdate } from '../helpers/apt-get';

describe('warp tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = createMockRunner();

    await warp.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'warp']]);
  });

  test('linux imports the warp signing key before apt update, then installs warp-terminal', async () => {
    const runner = createMockRunner();

    await warp.linux.install(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'mkdir', '-p', '/etc/apt/keyrings'],
      [
        'sudo',
        'sh',
        '-c',
        'curl -fsSL https://releases.warp.dev/linux/keys/warp.asc | gpg --batch --yes --dearmor -o /etc/apt/keyrings/warpdotdev.gpg',
      ],
      [
        'sudo',
        'sh',
        '-c',
        'echo "deb [signed-by=/etc/apt/keyrings/warpdotdev.gpg] https://releases.warp.dev/linux/deb stable main" > /etc/apt/sources.list.d/warpdotdev.list',
      ],
      aptGetUpdate(),
      aptGetInstall('warp-terminal'),
    ]);
  });
});
