import type { Command, Runner } from '../runner/runner';

/**
 * Runs a command and throws when it exits non-zero. The production Runner
 * (`Bun.$` with `.nothrow()`) never throws on its own — it hands the exit
 * code back in the `RunResult` — so every Helper's `install()` and
 * `uninstall()` must go through this instead of `runner.run()` directly, or
 * a failed write (e.g. `brew install` failing) looks like success to the
 * install engine, which detects failure by catching.
 *
 * Never use this for `isInstalled()`: a non-zero exit there is the
 * legitimate "not installed" answer, not a failure.
 */
export async function runChecked(runner: Runner, command: Command): Promise<void> {
  const result = await runner.run(command);
  if (result.exitCode !== 0) {
    throw new Error(`comando falhou (exit ${result.exitCode}): ${command.join(' ')}\n${result.stderr}`);
  }
}
