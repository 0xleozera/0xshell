# ADR-0005 — trpc-cli + zod router, one Command per file

**Status:** accepted · 2026-08-21

## Context

The CLI was born on `citty`: each command was a factory (`createInstallCommand(runner,
platform, options)`) returning a `defineCommand` object, with the argument
declaration, the validation and the use case all inside the same `run()`. Around them
the code was organized by **kind of piece** — `engine/`, `helpers/`, `runner/`,
`reporter/`, `tool/`, `sudo/` — and whatever was a command was scattered across
directories with an `index.ts` plus satellite files (`commands/install/index.ts`,
`dry-run.ts`, `prompt-tools.ts`, `catalog.ts`).

Three concrete consequences:

1. **The CLI surface did not fit in one read.** Finding out which flags exist meant
   opening four files and reading four `args` blocks in the middle of the logic.
2. **The argument declaration and its type were separate sources.** citty's `args`
   described the flag; the body of `run()` read `args.tag` and `args._` by hand, with
   the validation of each value spread across the command.
3. **The exit code was a side effect.** Each command wrote `process.exitCode = 1`
   directly, with the literal number in the middle of the use case, and a usage error
   (a Tool name that does not exist) was indistinguishable from an execution failure:
   both exited `1`.

## Decision

Adopt the architecture of the `nodejs-cli-architecture` skill, which solves all three
points with the same idea: **the command is the use case, and the router only
declares**.

- **`src/router.ts`** — the whole surface on one screen: one procedure per command,
  with a description, an input schema and one line binding each to its Command. No
  rule, no `await`, no branch.
- **`src/schemas/commands.ts`** — the zod schemas are the single source of truth for
  input. Flags, positionals, defaults, `--help` and the validation messages all come
  from them; types are inferred with `z.infer`, never written by hand.
- **`src/commands/<name>.ts`** — one command, one file, the whole use case: it
  resolves the input, decides, executes and **returns data**. No service, handler or
  controller layer underneath.
- **`src/lib/`** — everything else: effects (Runner, Reporter, sudo), the Catalog, the
  Helpers and the pure decisions two commands share (`select-tools`, `stage-order`,
  `summary`, `dry-run`).
- **`src/prompts/tools.ts`** — the questions, and only them. A prompt receives as
  parameters everything it needs to phrase itself and decides nothing.
- **`src/lib/errors.ts`** — one error type (`CliError`) and one exit-code table:
  `failed` → 1, `usage` → 2, `cancelled` → 130. No command knows a number.
- **`src/cli.ts`** — the composition root and the bin: it assembles the Context, runs
  the router and is the only place that turns an error (or a result) into an exit
  code.

`citty` goes and `trpc-cli` + `@trpc/server` come in. Two parsers side by side would
be the worst option — the same flag declared in two places, diverging at the first
change.

### The Context

ADR-0003 (injectable Runner) and ADR-0004 (injectable Reporter) set the rule this
project has followed from the start: **every seam with the outside world is injected
at the composition root**, never reached from inside the command. The skill, by
default, has the command import effects straight from `lib/` — which here would mean
testing `install` against the real machine's `brew`.

So injection stays, now consolidated into a single object handed over as the tRPC
context:

```
CliContext = { runner, reporter, platform, catalog, prompts }
```

A Command receives `(input, context)`. It is the only deliberate departure from the
skill, and it is what keeps the whole suite running without touching the machine —
including the third seam, the human one: prompts come in through the Context like the
other two, which leaves `--interactive` and `--all` testable without simulating a
terminal.

### Cancellation

A cancelled prompt (Ctrl+C) stops being treated as an "empty answer" and becomes
`CliError('cancelled')` → exit `130`, which is what the shell expects from a `^C`.
Before, cancelling the `--interactive` multiselect exited `0`, indistinguishable from
"I selected nothing", and cancelling the `--all` confirmation was identical to
answering "no".

## Consequences

`--help` is now generated from the schemas, with defaults and constraints visible, and
input validation happens **before** the command runs. A Tool name that does not exist
now exits `2` (wrong invocation) and an install that failed exits `1` — a script can
tell the two apart.

Commands return data (`{ summary, outcomes }`, `{ plan }`, `{ tools }`) instead of
printing and vanishing. Whoever reads `summary.failed` and picks the exit code is
`cli.ts`.

**trpc-cli boolean flags accept an optional value** (`--dry-run [boolean]`), so
`0xshell install --dry-run neovim` makes commander swallow `neovim` as the flag's value
and fail validation, with a clear message. The form that works is
`0xshell install neovim --dry-run` — or the flag at the end, as in the README. It is
the only surface regression of the migration, and it is loud, not silent.

The bin is now `src/cli.ts` (it was `src/index.ts`); `package.json` and the build
scripts follow. Choosing the Reporter by environment, described in ADR-0004 as
happening in `index.ts`, now happens in `cli.ts` — same composition root, another file
name.

**Left out**, deliberately, is the TTY guard the skill asks for around prompts
(`isInteractive()`): with no terminal and no flag, the right thing would be a usage
error naming the flag instead of a prompt that hangs the pipeline. It is a behavior
change, not a reorganization, so it did not go into this refactor.

## Alternatives considered

**Keep citty and only reorganize the folders.** Rejected: half of the gain is in
declaring the surface outside the use case, and citty does not derive flags, `--help`
or validation from a schema — they would remain two sources of truth.

**Follow the skill to the letter and import effects straight from `lib/` in the
commands.** Rejected: it contradicts ADR-0003 and ADR-0004, and the cost is the whole
suite — testing `install` would require a disposable machine per run, exactly what
that ADR exists to avoid.

**Pass the Runner and the Reporter as loose parameters of the Command
(`installCommand(input, runner, reporter, platform, catalog)`).** Rejected: five
positional parameters that grow with every new seam, and no place where the list is
written only once.
