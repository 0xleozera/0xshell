import { describe, expect, test } from 'bun:test';
import { createMockRunner } from './mock-runner';
import { createSudoSession } from './sudo-session';

describe('createSudoSession', () => {
  test('start() warns before running sudo -v', async () => {
    const runner = createMockRunner();
    const warnings: string[] = [];

    await createSudoSession(runner, { warn: (message) => warnings.push(message) }).start();

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('sudo');
    expect(runner.wasRun(['sudo', '-v'])).toBe(true);
  });

  test('start() rejects when sudo -v fails, e.g. a wrong password', async () => {
    const runner = createMockRunner();
    runner.failOn(['sudo', '-v']);

    await expect(createSudoSession(runner, { warn: () => {} }).start()).rejects.toThrow();
  });

  test('start() schedules a recurring sudo -v to keep the credential alive', async () => {
    const runner = createMockRunner();
    let scheduledCallback: (() => void) | undefined;
    let scheduledMs: number | undefined;

    const session = createSudoSession(runner, {
      warn: () => {},
      intervalMs: 30_000,
      setIntervalFn: (callback, ms) => {
        scheduledCallback = callback;
        scheduledMs = ms;
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
      clearIntervalFn: () => {},
    });

    await session.start();

    expect(scheduledMs).toBe(30_000);
    expect(runner.commands.filter((c) => c.join(' ') === 'sudo -v')).toHaveLength(1);

    scheduledCallback?.();
    await Promise.resolve();

    expect(runner.commands.filter((c) => c.join(' ') === 'sudo -v')).toHaveLength(2);
  });

  test('stop() clears the keep-alive timer', async () => {
    const runner = createMockRunner();
    let cleared: unknown;

    const session = createSudoSession(runner, {
      warn: () => {},
      setIntervalFn: () => 42 as unknown as ReturnType<typeof setInterval>,
      clearIntervalFn: (handle) => {
        cleared = handle;
      },
    });

    await session.start();
    session.stop();

    expect(cleared).toBe(42);
  });

  test('stop() before start(), or called twice, does not throw', () => {
    const runner = createMockRunner();
    const session = createSudoSession(runner, { warn: () => {} });

    expect(() => session.stop()).not.toThrow();
    expect(() => session.stop()).not.toThrow();
  });
});
