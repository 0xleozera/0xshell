import { describe, expect, test } from 'bun:test';

const runInstall = async (env: Record<string, string>) => {
  const proc = Bun.spawn(['sh', '../install.sh'], {
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stderr, exitCode] = await Promise.all([new Response(proc.stderr).text(), proc.exited]);
  return { stderr, exitCode };
};

describe('install.sh', () => {
  test('fails with a clear message on an unsupported OS', async () => {
    const { stderr, exitCode } = await runInstall({ OXSHELL_OS: 'Windows_NT', OXSHELL_ARCH: 'x86_64' });
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('unsupported platform');
  });

  test('fails with a clear message on darwin/x64 (no build published)', async () => {
    const { stderr, exitCode } = await runInstall({ OXSHELL_OS: 'Darwin', OXSHELL_ARCH: 'x86_64' });
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('unsupported platform');
  });

  test('fails with a clear message on linux/arm64 (no build published)', async () => {
    const { stderr, exitCode } = await runInstall({ OXSHELL_OS: 'Linux', OXSHELL_ARCH: 'aarch64' });
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('unsupported platform');
  });
});
