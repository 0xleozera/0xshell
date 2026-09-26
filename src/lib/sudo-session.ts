import type { Runner } from './runner';

/**
 * Background sudo-credential keep-alive. A single `sudo -v` only
 * validates the credential for sudo's own timestamp window; an install run
 * that takes several minutes needs it refreshed periodically, or `apt`
 * prompts for the password again mid-run with nobody watching. `start()`
 * warns why the password is needed, then validates once; `stop()` must run
 * no matter how the CLI ends, or the refresh timer outlives it as an
 * orphaned process.
 */
export interface SudoSession {
  start(): Promise<void>;
  stop(): void;
}

const DEFAULT_INTERVAL_MS = 60_000;

const WARNING =
  'This setup installs packages via apt, which on Linux requires root privilege.\n' +
  'The password below is used only by sudo, individually, on each apt command — the 0xshell process never runs as root.';

/**
 * The timer handle is typed `unknown` on purpose: the ambient
 * `setInterval`/`setTimeout` return types disagree between Bun's and Node's
 * lib declarations, and this module only needs the same value to round-trip
 * into `clearInterval`.
 */
export type CreateSudoSessionOptions = {
  readonly intervalMs?: number;
  readonly warn?: (message: string) => void;
  readonly setIntervalFn?: (callback: () => void, ms: number) => unknown;
  readonly clearIntervalFn?: (handle: unknown) => void;
};

/**
 * Real SudoSession: `sudo -v` up front (prompts for the password if needed),
 * then `sudo -n -v` on a timer until `stop()` is called. Runs every sudo
 * through the given Runner, same as any other command (ADR-0003) — the
 * timer is the only part that doesn't fit the Runner's request/response
 * shape, so it's isolated here instead of leaking a raw interval elsewhere.
 *
 * `sudo -n true` goes first: when sudo already lets this user in without a
 * password (NOPASSWD, or a credential still cached), there is nothing to ask.
 * `sudo -v` itself cannot be the test — it demands a password whenever any
 * sudoers rule for the user has one, even next to a NOPASSWD rule, and fails
 * outright with no terminal to ask on. The refresh is `-n` so a lapsed
 * credential never opens a prompt in the middle of the run.
 */
export function createSudoSession(runner: Runner, options: CreateSudoSessionOptions = {}): SudoSession {
  const {
    intervalMs = DEFAULT_INTERVAL_MS,
    warn = (message) => console.log(message),
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval as (handle: unknown) => void,
  } = options;

  let timer: unknown;

  return {
    async start(): Promise<void> {
      const allowed = await runner.run(['sudo', '-n', 'true']);
      if (allowed.exitCode !== 0) {
        warn(WARNING);
        const result = await runner.run(['sudo', '-v']);
        if (result.exitCode !== 0) {
          throw new Error('could not validate the sudo credentials');
        }
      }
      timer = setIntervalFn(() => {
        void runner.run(['sudo', '-n', '-v']);
      }, intervalMs);
    },
    stop(): void {
      if (timer !== undefined) {
        clearIntervalFn(timer);
        timer = undefined;
      }
    },
  };
}
