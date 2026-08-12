import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../runner/mock-runner';
import { aptRepo } from './apt-repo';

const options = {
  repo: 'deb https://packagecloud.io/slacktechnologies/slack/debian/ jessie main',
  packageName: 'slack-desktop',
};

describe('aptRepo', () => {
  test('install() adds the repo, updates, then installs the package', async () => {
    const runner = new MockRunner();

    await aptRepo(options).install(runner);

    expect(runner.commands).toEqual([
      ['add-apt-repository', '-y', options.repo],
      ['apt', 'update'],
      ['apt', 'install', '-y', options.packageName],
    ]);
  });

  test('uninstall() runs apt remove -y <package>', async () => {
    const runner = new MockRunner();

    await aptRepo(options).uninstall(runner);

    expect(runner.wasRun(['apt', 'remove', '-y', options.packageName])).toBe(true);
  });

  test('isInstalled() reflects the exit code of dpkg -s <package>', async () => {
    const runner = new MockRunner();
    runner.respondTo(['dpkg', '-s', options.packageName], { exitCode: 0 });

    expect(await aptRepo(options).isInstalled(runner)).toBe(true);
  });

  test('isInstalled() is false when dpkg -s <package> fails', async () => {
    const runner = new MockRunner();
    runner.failOn(['dpkg', '-s', options.packageName]);

    expect(await aptRepo(options).isInstalled(runner)).toBe(false);
  });
});
