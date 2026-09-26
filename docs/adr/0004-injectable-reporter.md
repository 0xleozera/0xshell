# ADR-0004 — Injectable Reporter, with two renderings

**Status:** accepted · 2026-08-13

> **Update (ADR-0005):** the composition root is now `src/cli.ts` (it was
> `index.ts`), and the Reporter reaches commands inside the `CliContext`. Commands no
> longer have a default Reporter: it is always injected, which removes the last chance
> of a command rendering differently depending on the test environment.

## Context

Until now every command wrote straight to the `console`: 27 `console.log` /
`console.error` calls spread across six files, with a vocabulary of symbols
(`✓`, `✗`, `⊘`, `=`, `→`) repeated inline in each one and a nearly identical
`reportOutcome` triplicated across `install`, `uninstall` and `doctor`.

That caused two problems of different natures.

The first is experience. A `0xshell install` on a new machine runs 23 Tools in
sequence, and a single `brew install` takes minutes. Since each Tool's line was only
printed **after** it finished, the CLI spent a good part of the setup in absolute
silence — indistinguishable from a hang, precisely in the command that exists to be
left running on its own.

The second is coupling. Six test files depended on `spyOn(console, 'log')`: the tests
were tied to the global `console`, not to a domain port, so any presentation change
would break them all at once.

The project already had `@clack/prompts` as a dependency, used only for **input**
(the `--interactive` multiselect, the `--all` confirmation).

## Decision

All output goes through a `Reporter` interface, injected into the commands — the same
shape [ADR-0003](0003-injectable-shell-runner.md) gave to machine access. No command
calls `console.*`: it describes **what happened** and the Reporter decides how that
looks.

Each Tool gets a line opened **before** its command runs (`onToolStart`, a new hook of
`runInstallPlan`) and closed with its Outcome (`onOutcome`). That is what makes a long
`install` readable, and it is why the hook lives in the engine instead of the command
printing on its own.

Two implementations, picked in `index.ts` by the environment:

- **`clack-reporter`** — interactive terminal. `intro`/`outro` bound the run, a
  spinner follows each Tool and turns into its result line, the final summary closes
  in a framed block. It uses `@clack/prompts`, which was already in the project for
  the prompts: the whole CLI speaks with a single visual voice.
- **`plain-reporter`** — everything else: pipe, file, CI, `TERM=dumb`. One line in,
  one line out, no ANSI and no cursor movement.

The rule that separates the two is **decoration goes, information stays**. In the
plain one, `intro`/`outro` print nothing and the spinner does not exist (progress is a
terminal affordance; duplicating each Tool line in a CI log only gets in the way), but
every Tool line, every warning and the summary come out literally — with the same
symbols as before, byte for byte, and with errors on `stderr`.

## Consequences

The output vocabulary becomes domain data, not loose strings: the five possible
endings of a line (`succeed`, `skip`, `noop`, `absent`, `fail`) are declared on the
port, and each command picks one. That is what kept, without an `if`, the distinction
`doctor` makes and `install` does not — a missing tool is the normal finding of an
audit (`absent`), not a failure of the command (`fail`).

Tests can now assert on what was **reported**, through `MockReporter`, instead of on
the glyphs and colors of one specific rendering. The old tests that spy on the
`console` remain valid: the commands' default Reporter is the plain one, whose output
is the same as before.

**In the interactive rendering everything goes to `stdout`, errors included.** clack
draws a connected flow (`│`) and throwing half of it to `stderr` would tear the drawing
in the middle. Nothing is lost: that rendering is only chosen when `stdout` is a
terminal, and the moment output is redirected the plain Reporter takes over, keeping
`stderr` separate. Whoever uses `2>` is never in the interactive rendering.

Two clack pitfalls are recorded because they are not obvious:

1. `spinner().start()` subscribes to `SIGINT` and, by doing so, takes Node's default
   termination away. Untreated, a Ctrl+C in the middle of `install` would clear the
   spinner and keep installing the other twenty Tools. `clack-reporter` registers its
   own shutdown right after `start()`.
2. Every `log.message()` draws a blank rule before the message. Nice for three
   messages, terrible for 23 catalog lines — so `list` and the `--dry-run`s send the
   whole block in a single call. The resulting text is identical line by line; only
   the spacing in the interactive rendering changes.

## Alternatives considered

**Keep using the `console` and just add color.** Rejected: it does not solve the
silence during long installs, which is the real problem, and it keeps the tests
coupled to the global `console`.

**`consola` instead of clack.** Rejected: clack was already a dependency of the
project for the prompts. Bringing a second output library would mean two aesthetics
living on the same screen — the `--interactive` prompt in one, the rest of the run in
the other.

**A single rendering, detecting the TTY inside it.** Rejected: the detection would end
up spread across every method, and the terminal version needs things (spinner, frame,
connected flow) that have no honest translation in a log. Two implementations of the
same port keep each one consistent with itself.

**The command deciding the rendering (`resolveReporter()` as the command's default).**
Rejected: a command that looks at `process.stdout` renders differently under
`bun test` depending on whether the suite ran from a terminal or from CI. The choice
belongs to the composition root (`index.ts`); the commands' default is the plain
Reporter, which is deterministic.
