import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import logitechGHub from './logitech-g-hub';

describe('logitech-g-hub tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = createMockRunner();

    await logitechGHub.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'logitech-g-hub']]);
  });

  test('linux is unsupported, reported with a reason', () => {
    expect(logitechGHub.linux).toEqual({ unsupported: true, reason: 'sem cliente Linux oficial' });
  });
});
