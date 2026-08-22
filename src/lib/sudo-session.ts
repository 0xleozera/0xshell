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
  'Este setup instala pacotes via apt, que no Linux exige privilégio de root.\n' +
  'A senha a seguir é usada apenas pelo sudo, individualmente, em cada comando apt — o processo do 0xshell não roda como root.';

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
 * then again on a timer until `stop()` is called. Runs every `sudo -v`
 * through the given Runner, same as any other command (ADR-0003) — the
 * timer is the only part that doesn't fit the Runner's request/response
 * shape, so it's isolated here instead of leaking a raw interval elsewhere.
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
      warn(WARNING);
      const result = await runner.run(['sudo', '-v']);
      if (result.exitCode !== 0) {
        throw new Error('não foi possível validar as credenciais do sudo');
      }
      timer = setIntervalFn(() => {
        void runner.run(['sudo', '-v']);
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
