import { describe, expect, test } from 'bun:test';
import { userInfo } from 'node:os';
import { createMockRunner } from '../mock-runner';
import zsh from './zsh';
import { aptGetInstall, aptGetRemove } from '../helpers/apt-get';

const user = userInfo().username;
const loginShell = ['sh', '-c', 'getent passwd "$1" | cut -d: -f7', 'sh', user];

describe('zsh tool', () => {
  test('darwin installs the brew formula', async () => {
    const runner = createMockRunner();

    await zsh.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', 'zsh']]);
  });

  test('linux installs the apt package and makes it the login shell', async () => {
    const runner = createMockRunner();

    await zsh.linux.install(runner);

    expect(runner.commands).toEqual([
      aptGetInstall('zsh'),
      ['sudo', 'chsh', '-s', '/usr/bin/zsh', user],
    ]);
  });

  test('linux switches the login shell back to bash before removing zsh', async () => {
    const runner = createMockRunner();

    await zsh.linux.uninstall(runner);

    expect(runner.commands).toEqual([
      ['sudo', 'chsh', '-s', '/bin/bash', user],
      aptGetRemove('zsh'),
    ]);
  });

  test('linux requires privilege', () => {
    expect(zsh.linux.requiresPrivilege).toBe(true);
  });

  test('linux counts as installed only when zsh is also the login shell', async () => {
    const runner = createMockRunner();
    runner.respondTo(loginShell, { stdout: '/bin/bash\n' });
    runner.respondTo(['dpkg-query', '-W', '-f=${Status}', 'zsh'], { stdout: 'install ok installed' });

    expect(await zsh.linux.isInstalled(runner)).toBe(false);

    runner.respondTo(loginShell, { stdout: '/usr/bin/zsh\n' });

    expect(await zsh.linux.isInstalled(runner)).toBe(true);
  });

  test('writes ~/.zshrc and ~/.zprofile', () => {
    expect(zsh.configuration?.files.map((file) => file.path)).toEqual(['.zshrc', '.zprofile']);
  });
});
