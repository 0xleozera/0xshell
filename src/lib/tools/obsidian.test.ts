import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import obsidian from './obsidian';

describe('obsidian tool', () => {
  test('darwin installs the brew cask', async () => {
    const runner = createMockRunner();

    await obsidian.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'obsidian']]);
  });

  test('linux downloads the newest release .deb, skipping mobile-only releases', async () => {
    const runner = createMockRunner();

    await obsidian.linux.install(runner);

    expect(runner.commands[0]?.[2]).toContain('https://api.github.com/repos/obsidianmd/obsidian-releases/releases');
    expect(runner.commands[0]?.[2]).toContain('obsidian_[^/"]+_amd64\\.deb');
    expect(runner.commands[0]?.slice(3)).toEqual(['sh', '/tmp/0xshell-obsidian.deb']);
  });
});
