import { describe, expect, test } from 'bun:test';
import { aptGetInstall } from '../helpers/apt-get';
import { createMockRunner } from '../mock-runner';
import ripgrep from './ripgrep';

describe('ripgrep tool', () => {
  test('linux installs the ripgrep apt package', async () => {
    const runner = createMockRunner();

    await ripgrep.linux.install(runner);

    expect(runner.commands).toEqual([aptGetInstall('ripgrep')]);
  });
});
