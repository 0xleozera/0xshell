import { describe, expect, test } from 'bun:test';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createMockRunner } from '../mock-runner';
import eza from './eza';
import { aptGetInstall } from '../helpers/apt-get';

describe('eza tool', () => {
  test('darwin installs the brew formula', async () => {
    const runner = createMockRunner();

    await eza.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', 'eza']]);
  });

  test('linux installs from the signed eza apt repository', async () => {
    const runner = createMockRunner();

    await eza.linux.install(runner);

    expect(runner.commands).toContainEqual([
      'sudo',
      'sh',
      '-c',
      'echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" > /etc/apt/sources.list.d/gierens.list',
    ]);
    expect(runner.commands.at(-1)).toEqual(aptGetInstall('eza'));
  });

  test('writes the theme where EZA_CONFIG_DIR points', () => {
    expect(eza.configuration?.root).toBe(join(homedir(), '.config', 'eza'));
    expect(eza.configuration?.files.map((file) => file.path)).toEqual(['theme.yml']);
  });
});
