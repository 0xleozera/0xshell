import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import neovim from './neovim';

describe('neovim tool', () => {
  test('darwin installs the aqua backend via mise, not a brew formula', async () => {
    const runner = createMockRunner();

    await neovim.darwin.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'aqua:neovim/neovim']]);
  });

  test('linux installs the aqua backend via mise, not the apt package', async () => {
    const runner = createMockRunner();

    await neovim.linux.install(runner);

    expect(runner.commands).toEqual([['mise', 'install', 'aqua:neovim/neovim']]);
  });
});
