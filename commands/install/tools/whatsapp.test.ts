import { describe, expect, test } from 'bun:test';
import { MockRunner } from '../../../runner/mock-runner';
import whatsapp from './whatsapp';

describe('whatsapp tool', () => {
  test('darwin produces the exact brew cask install command', async () => {
    const runner = new MockRunner();

    await whatsapp.darwin.install(runner);

    expect(runner.commands).toEqual([['brew', 'install', '--cask', 'whatsapp']]);
  });

  test('linux is unsupported, reported with a reason', () => {
    expect(whatsapp.linux).toEqual({ unsupported: true, reason: 'sem cliente Linux oficial' });
  });
});
