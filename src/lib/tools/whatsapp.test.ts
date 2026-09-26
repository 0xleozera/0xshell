import { describe, expect, test } from 'bun:test';
import { createMockRunner } from '../mock-runner';
import whatsapp from './whatsapp';

describe('whatsapp tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = createMockRunner();

    await whatsapp.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'whatsapp']]);
  });

  test('linux is unsupported, reported with a reason', () => {
    expect(whatsapp.linux).toEqual({ unsupported: true, reason: 'no official Linux client' });
  });
});
