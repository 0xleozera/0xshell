import { describe, expect, test } from 'bun:test';
import { confirmAll } from './confirm-all';

describe('confirmAll', () => {
  test('returns true when the prompt is confirmed', async () => {
    const fakePrompt = async () => true;

    const confirmed = await confirmAll(undefined, fakePrompt);

    expect(confirmed).toBe(true);
  });

  test('returns false when the prompt is declined', async () => {
    const fakePrompt = async () => false;

    const confirmed = await confirmAll(undefined, fakePrompt);

    expect(confirmed).toBe(false);
  });

  test('returns false, without throwing, when the prompt is cancelled', async () => {
    const fakePrompt = async () => Symbol('cancel');

    const confirmed = await confirmAll(undefined, fakePrompt);

    expect(confirmed).toBe(false);
  });

  test('passes the given message through to the prompt', async () => {
    let seenMessage = '';
    const fakePrompt = async (opts: { message: string }) => {
      seenMessage = opts.message;
      return true;
    };

    await confirmAll('desinstalar tudo?', fakePrompt);

    expect(seenMessage).toBe('desinstalar tudo?');
  });
});
