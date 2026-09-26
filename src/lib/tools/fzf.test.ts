import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import fzf from './fzf';
import { aptGetInstall } from '../helpers/apt-get';

describe('fzf tool', () => {
  test('darwin installs the brew formula', async () => {
    const runner = createMockRunner();

    await fzf.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', 'fzf']]);
  });

  test('linux installs the apt package', async () => {
    const runner = createMockRunner();

    await fzf.linux.install(runner);

    expect(runner.commands).toEqual([aptGetInstall('fzf')]);
  });
});
