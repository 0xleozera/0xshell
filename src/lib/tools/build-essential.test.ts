import { describe, expect, test } from 'bun:test';
import { aptGetInstall } from '../helpers/apt-get';
import { createMockRunner } from '../mock-runner';
import buildEssential from './build-essential';

describe('build-essential tool', () => {
  test('linux installs the build-essential apt package', async () => {
    const runner = createMockRunner();

    await buildEssential.linux.install(runner);

    expect(runner.commands).toEqual([aptGetInstall('build-essential')]);
  });
});
