import { describe, expect, test } from 'bun:test';
import { aptGetInstall, aptGetRemove } from '../helpers/apt-get';
import { createMockRunner } from '../mock-runner';
import orcaAi from './orca-ai';

const status = ['dpkg-query', '-W', '-f=${Status}', 'orca-ide'];

describe('orca-ai tool', () => {
  test('darwin installs from the project tap, never the core orca cask', async () => {
    const runner = createMockRunner();

    await orcaAi.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'stablyai/orca/orca']]);
  });

  test('linux downloads the latest release .deb, installs it with apt and removes the download', async () => {
    const runner = createMockRunner();

    await orcaAi.linux.install(runner);

    const [download, install, cleanup] = runner.commands;
    expect(download?.[2]).toContain('https://github.com/stablyai/orca/releases/latest');
    expect(download?.[2]).toContain('orca-ide_${version}_amd64.deb -o "$1"');
    expect(download?.slice(3)).toEqual(['sh', '/tmp/0xshell-orca-ide.deb']);
    expect(install).toEqual(aptGetInstall('/tmp/0xshell-orca-ide.deb'));
    expect(cleanup).toEqual(['rm', '-f', '/tmp/0xshell-orca-ide.deb']);
  });

  test('linux removes the download even when apt fails', async () => {
    const runner = createMockRunner();
    runner.failOn(aptGetInstall('/tmp/0xshell-orca-ide.deb'));

    await expect(orcaAi.linux.install(runner)).rejects.toThrow();
    expect(runner.wasRun(['rm', '-f', '/tmp/0xshell-orca-ide.deb'])).toBe(true);
  });

  test('linux uninstall removes the orca-ide package', async () => {
    const runner = createMockRunner();

    await orcaAi.linux.uninstall(runner);

    expect(runner.commands).toEqual([aptGetRemove('orca-ide')]);
  });

  test('linux checks the package, not `command -v orca` (the GNOME screen reader)', async () => {
    const runner = createMockRunner();
    runner.respondTo(status, { stdout: 'install ok installed' });

    expect(await orcaAi.linux.isInstalled(runner)).toBe(true);
    expect(runner.commands).toEqual([status]);
  });
});
