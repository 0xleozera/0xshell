import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import warp from './warp';

describe('warp tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = new MockRunner();

    await warp.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'warp']]);
  });

  test('linux imports the warp signing key before apt update, then installs warp-terminal', async () => {
    const runner = new MockRunner();

    await warp.linux.install(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'mkdir', '-p', '/etc/apt/keyrings'],
      [
        'sudo',
        'sh',
        '-c',
        'curl -fsSL https://releases.warp.dev/linux/keys/warp.asc | gpg --dearmor -o /etc/apt/keyrings/warp.gpg',
      ],
      [
        'sudo',
        'sh',
        '-c',
        'echo "deb [signed-by=/etc/apt/keyrings/warp.gpg] https://releases.warp.dev/linux/deb stable main" > /etc/apt/sources.list.d/warp.list',
      ],
      ['sudo', 'apt', 'update'],
      ['sudo', 'apt', 'install', '-y', 'warp-terminal'],
    ]);
  });
});
