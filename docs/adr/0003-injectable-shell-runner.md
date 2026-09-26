# ADR-0003 — Injectable shell Runner

**Status:** accepted · 2026-08-12

> **Update (ADR-0005):** the Runner is now handed to commands inside the
> `CliContext`, assembled in `src/cli.ts`. The decision itself — every shell access
> goes through an injectable interface — still holds unchanged.

## Context

The whole job of `0xshell` is mutating the machine: installing Homebrew, running
`brew install --cask`, `sudo apt install`, mounting a `.dmg`. A CLI like that has no
obvious unit test — you cannot run `apt install` in a test, and testing it for real
would need a disposable machine per run.

The cost of not testing is specific and expensive: the most likely bug in the project
is **a misspelled cask or package name**, and without tests it only shows up on the
new machine, during setup — exactly when discovering a bug costs the most and
patience is at its lowest.

## Decision

Every shell access goes through a `Runner` interface. In production it is implemented
with `Bun.$`; in tests, by a mock. No Tool module calls `Bun.$` directly.

With that, what becomes testable without touching the machine:

- the zod schema of `defineTool` and the validation of the catalog
- platform resolution (`darwin` / `linux` / `unsupported`)
- ordering by `stage`
- the commands each Helper **produces** — this is where the misspelled cask name dies
- the failure policy: stage 0 fatal, the others collected
- the final summary and the exit code

## Consequences

One more indirection between the module and the shell. It is the direct cost of this
decision and it is small: the Helpers are already the natural passage point, so the
`Runner` goes into them and the Tool modules never see it.

Real integration tests **are left out** — deliberately, not by oversight. Running the
Linux path in a CI container is cheap and is worth its own initiative; the macOS path
is not viable in CI. Coverage here is unit coverage, over the mocked `Runner`.

A corollary that has to be respected: if a module calls `Bun.$` directly, it leaves
the test net without any sign of error. A lint rule is worth it when the project
grows.

## Alternatives considered

**No tests — "it is a personal script".** Rejected: it is a personal script whose
failure happens at the worst possible moment, with the debugging cost inflated by
being on a machine that does not have any tool yet.

**Integration tests in a container from v1.** Rejected for the first cut: it covers
only half of the platforms, it is slow, and it does not catch more package-name
mistakes than the unit test over the `Runner` already does.
