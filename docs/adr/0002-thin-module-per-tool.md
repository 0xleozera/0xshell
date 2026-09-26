# ADR-0002 — One thin module per tool, on top of shared helpers

**Status:** accepted · 2026-08-12

## Context

The Catalog has ~22 Tools, and they fall into very few install patterns: Homebrew
cask, Homebrew formula, apt package, third-party apt repository, mise tool, `.dmg`
downloaded directly. Two architectures were on the table:

- **Declarative catalog**: an array validated by zod with a _discriminated union_ on
  `kind`, and a generic executor per `kind`. Adding a tool = adding a line of data.
  Less code, but the whole catalog is a single structure.
- **One module per tool**: one file per Tool, each with its recipe.

Looking at installation alone, the declarative catalog wins easily: it avoids 22 files
that would be 90% the same `brew install --cask` call.

The deciding factor came from outside installation. [ADR-0001](0001-v1-installs-does-not-configure.md)
leaves configuration for a later phase, and that phase is intrinsically
**tool-specific** — neovim's `configure()` has nothing in common with 1Password's. In
a declarative catalog, that phase would have nowhere to live without breaking the
structure.

## Decision

One module per Tool in `src/commands/install/tools/<id>.ts`, but **thin**: its body is
data, not procedure. The recipe comes from shared Helpers.

```ts
export default defineTool({
  id: 'slack',
  tags: ['apps'],
  stage: 3,
  darwin: brewCask('slack'),
  linux: aptRepo({ ... }),
})
```

Helpers: `brewCask`, `brewFormula`, `apt`, `aptRepo`, `mise`, `dmg`, `script`,
`custom`. Each Helper carries the default `isInstalled()` of its install method, and
the module can override it. A Tool that does not exist on a platform declares
`unsupported(reason)` — which is reported in the summary, never silent.

Execution order comes from the `stage` field (0–3), not from a dependency graph: 22
nodes with two real edges, and a generic topological sort would be machinery for a
problem the project does not have.

## Consequences

The repository will have ~22 files of five lines each. **This is intentional** — it is
not accidental boilerplate waiting to be extracted. Whoever "cleans this up" by
collapsing the catalog into a data structure will be undoing this decision, and
should reopen ADR-0001 first.

In exchange, the configuration phase finds the file ready: each Tool gains a
`configure()` next to its `install`, without touching the architecture.

Accepted risk: with the recipe spread across 22 files, a cross-cutting change (a new
field in the schema) touches 22 files. Mitigated by the single zod schema of
`defineTool`, which makes the compiler point at all of them at once.

## Alternatives considered

**Declarative catalog with a discriminated union.** Rejected for the reason above: it
is the best architecture for today's problem and the wrong one for tomorrow's, which
is already dated in ADR-0001.

**"Fat" module** — each Tool actually writing its own `install()`. Rejected: it would
produce 22 diverging copies of `brew install --cask`, and fixing an install bug would
have to be done 22 times.
