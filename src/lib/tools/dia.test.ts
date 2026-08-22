import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import dia from './dia';

describe('dia tool', () => {
  test('darwin mounts the dmg and copies Dia.app into /Applications', async () => {
    const runner = createMockRunner();

    await dia.darwin.install(runner);

    expect(runner.commands).toEqual([
      ['curl', '-fsSL', 'https://diabrowser.com/download/dia.dmg', '-o', '/tmp/0xshell-Dia.dmg'],
      ['hdiutil', 'attach', '/tmp/0xshell-Dia.dmg', '-mountpoint', '/Volumes/Dia', '-nobrowse', '-quiet'],
      ['cp', '-R', '/Volumes/Dia/Dia.app', '/Applications/'],
      ['hdiutil', 'detach', '/Volumes/Dia', '-quiet'],
    ]);
  });

  test('linux is unsupported, reported with a reason', () => {
    expect(dia.linux).toEqual({ unsupported: true, reason: 'sem cliente Linux, apenas macOS' });
  });
});
