import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import onePassword from './1password';

describe('1password tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = createMockRunner();

    await onePassword.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', '1password']]);
  });

  test('linux imports the 1Password signing key before apt update, then installs 1password', async () => {
    const runner = createMockRunner();

    await onePassword.linux.install(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'mkdir', '-p', '/etc/apt/keyrings'],
      [
        'sudo',
        'sh',
        '-c',
        'curl -fsSL https://downloads.1password.com/linux/keys/1password.asc | gpg --dearmor -o /etc/apt/keyrings/1password.gpg',
      ],
      [
        'sudo',
        'sh',
        '-c',
        'echo "deb [signed-by=/etc/apt/keyrings/1password.gpg] https://downloads.1password.com/linux/debian/amd64 stable main" > /etc/apt/sources.list.d/1password.list',
      ],
      ['sudo', 'apt', 'update'],
      ['sudo', 'apt', 'install', '-y', '1password'],
    ]);
  });
});
