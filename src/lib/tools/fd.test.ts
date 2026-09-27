import { describe, expect, test } from 'bun:test';
import { aptGetInstall } from '../helpers/apt-get';
import { createMockRunner } from '../mock-runner';
import fd from './fd';

describe('fd tool', () => {
  test('linux installs the fd-find apt package', async () => {
    const runner = createMockRunner();

    await fd.linux.install(runner);

    expect(runner.commands).toEqual([aptGetInstall('fd-find')]);
  });
});
