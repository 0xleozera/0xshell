import { describe, expect, test } from 'bun:test';
import { resolveReporter } from './resolve-reporter';

/**
 * The two Reporters expose the same shape, so the probe is behavioral:
 * `intro` is decoration, which the plain Reporter drops and the interactive
 * one draws. Everything the terminal would see is captured so the assertion
 * never depends on which channel a rendering happens to use.
 */
function drawsIntro(reporter: ReturnType<typeof resolveReporter>): boolean {
  let wrote = false;
  const originalWrite = process.stdout.write.bind(process.stdout);
  const originalLog = console.log;

  process.stdout.write = (() => {
    wrote = true;
    return true;
  }) as typeof process.stdout.write;
  console.log = () => {
    wrote = true;
  };

  try {
    reporter.intro('0xshell install');
  } finally {
    process.stdout.write = originalWrite;
    console.log = originalLog;
  }

  return wrote;
}

describe('resolve reporter', () => {
  test('uses the interactive rendering when stdout is a terminal', () => {
    expect(drawsIntro(resolveReporter({ isTTY: true, env: {} }))).toBe(true);
  });

  test('falls back to plain when stdout is not a terminal', () => {
    expect(drawsIntro(resolveReporter({ isTTY: false, env: {} }))).toBe(false);
  });

  test('falls back to plain under CI, where spinner frames become log noise', () => {
    expect(drawsIntro(resolveReporter({ isTTY: true, env: { CI: 'true' } }))).toBe(false);
  });

  test('falls back to plain on a terminal that declares it cannot move the cursor', () => {
    expect(drawsIntro(resolveReporter({ isTTY: true, env: { TERM: 'dumb' } }))).toBe(false);
  });
});
