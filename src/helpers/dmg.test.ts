import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../runner/mock-runner';
import { dmg } from './dmg';

const options = { url: 'https://example.com/Dia.dmg', appName: 'Dia' };

describe('dmg', () => {
  test('install() downloads, mounts, copies to /Applications and unmounts', async () => {
    const runner = new MockRunner();

    await dmg(options).install(runner);

    expect(runner.commands).toEqual([
      ['curl', '-fsSL', options.url, '-o', '/tmp/0xshell-Dia.dmg'],
      ['hdiutil', 'attach', '/tmp/0xshell-Dia.dmg', '-mountpoint', '/Volumes/Dia', '-nobrowse', '-quiet'],
      ['cp', '-R', '/Volumes/Dia/Dia.app', '/Applications/'],
      ['hdiutil', 'detach', '/Volumes/Dia', '-quiet'],
    ]);
  });

  test('install() detaches the volume even when the copy fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['cp', '-R', '/Volumes/Dia/Dia.app', '/Applications/']);

    await expect(dmg(options).install(runner)).rejects.toThrow();

    expect(runner.wasRun(['hdiutil', 'detach', '/Volumes/Dia', '-quiet'])).toBe(true);
  });

  test('install() rejects when the download fails, without attempting to mount', async () => {
    const runner = new MockRunner();
    runner.failOn(['curl', '-fsSL', options.url, '-o', '/tmp/0xshell-Dia.dmg']);

    await expect(dmg(options).install(runner)).rejects.toThrow();

    expect(runner.wasRun(['hdiutil', 'attach', '/tmp/0xshell-Dia.dmg', '-mountpoint', '/Volumes/Dia', '-nobrowse', '-quiet'])).toBe(
      false,
    );
  });

  test('install() rejects when the mount fails, without attempting to detach', async () => {
    const runner = new MockRunner();
    runner.failOn(['hdiutil', 'attach', '/tmp/0xshell-Dia.dmg', '-mountpoint', '/Volumes/Dia', '-nobrowse', '-quiet']);

    await expect(dmg(options).install(runner)).rejects.toThrow();

    expect(runner.wasRun(['hdiutil', 'detach', '/Volumes/Dia', '-quiet'])).toBe(false);
  });

  test('uninstall() removes the app bundle from /Applications', async () => {
    const runner = new MockRunner();

    await dmg(options).uninstall(runner);

    expect(runner.wasRun(['rm', '-rf', '/Applications/Dia.app'])).toBe(true);
  });

  test('isInstalled() reflects existence of /Applications/<App>.app', async () => {
    const runner = new MockRunner();
    runner.respondTo(['test', '-d', '/Applications/Dia.app'], { exitCode: 0 });

    expect(await dmg(options).isInstalled(runner)).toBe(true);
  });

  test('isInstalled() is false when the app bundle does not exist', async () => {
    const runner = new MockRunner();
    runner.failOn(['test', '-d', '/Applications/Dia.app']);

    expect(await dmg(options).isInstalled(runner)).toBe(false);
  });
});
