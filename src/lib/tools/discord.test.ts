import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import discord from './discord';

describe('discord tool', () => {
  test('darwin installs the brew cask', async () => {
    const runner = createMockRunner();

    await discord.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'discord']]);
  });

  test('linux downloads the .deb Discord redirects to', async () => {
    const runner = createMockRunner();

    await discord.linux.install(runner);

    expect(runner.commands[0]?.[2]).toContain('https://discord.com/api/download?platform=linux&format=deb');
    expect(runner.commands[0]?.slice(3)).toEqual(['sh', '/tmp/0xshell-discord.deb']);
  });
});
