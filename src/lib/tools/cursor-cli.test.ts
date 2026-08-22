import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import cursorCli from './cursor-cli';

describe('cursor-cli tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = createMockRunner();

    await cursorCli.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'cursor-cli']]);
  });

  test('linux pipes the official install script into sh', async () => {
    const runner = createMockRunner();

    await cursorCli.linux.install(runner);

    expect(runner.commands).toEqual([['sh', '-c', 'curl -fsSL https://cursor.com/install | sh']]);
  });
});
