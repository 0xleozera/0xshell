import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import orcaAi from './orca-ai';

const binPath = join(homedir(), '.local', 'bin', 'orca');

describe('orca-ai tool', () => {
  test('darwin installs from the project tap, never the core orca cask', async () => {
    const runner = new MockRunner();

    await orcaAi.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'stablyai/orca/orca']]);
  });

  test('linux downloads the universal AppImage', async () => {
    const runner = new MockRunner();

    await orcaAi.linux.install(runner);

    expect(runner.commands).toEqual([
      ['mkdir', '-p', join(homedir(), '.local', 'bin')],
      ['curl', '-fsSL', 'https://download.stably.ai/orca/Orca.AppImage', '-o', binPath],
      ['chmod', '+x', binPath],
    ]);
  });
});
