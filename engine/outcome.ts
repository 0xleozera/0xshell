/**
 * What happened to one Tool during a plan run (issue #4). `unsupported` and
 * `failed` both carry a reason so the summary can report them in detail.
 */
export type Outcome =
  | { readonly status: 'installed'; readonly id: string }
  | { readonly status: 'already-installed'; readonly id: string }
  | { readonly status: 'unsupported'; readonly id: string; readonly reason: string }
  | { readonly status: 'failed'; readonly id: string; readonly error: string };
