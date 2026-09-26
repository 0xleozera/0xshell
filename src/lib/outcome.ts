import type { ConfigureResult } from './configuration';

/**
 * What happened to one Tool during a plan run. `unsupported` and `failed`
 * both carry a reason so the summary can report them in detail.
 * `configuration` is set only when `install` applied a Tool's Configuration
 * (ADR-0006); `uninstall` never touches configuration.
 */
export type Outcome =
  | { readonly status: 'installed'; readonly id: string; readonly configuration?: ConfigureResult }
  | { readonly status: 'already-installed'; readonly id: string; readonly configuration?: ConfigureResult }
  | { readonly status: 'unsupported'; readonly id: string; readonly reason: string }
  | { readonly status: 'failed'; readonly id: string; readonly error: string };
