# CONTEXT — 0xshell

A Bun CLI that installs and configures, on a new machine, the fixed set of tools of
the development setup. Supports macOS (Homebrew) and Linux (apt).

Everything in the project is written in English: code, comments, tests, docs and the
messages the CLI prints.

## Glossary

These terms have a precise meaning in this project. Use them in code, issue titles and
tests — do not drift to the synonyms listed under "avoid".

### Tool

An installable unit of the Catalog. It maps to exactly one module in
`src/lib/tools/<id>.ts`. A Tool declares its `id`, its `tags`, its `stage`, one install
recipe per Platform and, optionally, its Configuration.

_Avoid as a synonym:_ "package", "dependency", "app". A Tool can be a GUI app, a CLI
binary or a runtime — the word is the same.

### Catalog

The set of all registered Tools. It is the single source of truth about what
`0xshell` installs. `0xshell list` prints the Catalog with the status per Platform.

### Helper

A function that builds a Tool's install recipe for one Platform: `brewCask`,
`brewFormula`, `apt`, `aptRepo`, `mise`, `dmg`, `appImage`, `script`, `custom`.

A Helper carries three things: `install()`, its paired `uninstall()`, and the default
`isInstalled()` for that install method (e.g. `brewCask` checks
`brew list --cask <id>`). The Tool module can override any of the three.

Every apt write goes through `helpers/apt-get.ts` (`apt-get` under `sudo`,
non-interactive, waiting for the dpkg lock), and "installed" for an apt package means
`dpkg-query` reports `install ok installed` — a removed package keeps its
configuration and `dpkg -s` would still find it. `aptRepo` removes its source and
keyring on `uninstall`: a source left behind is fetched by every later `apt update`.

### Stage

A fixed execution phase, from `0` to `3`. It replaces a dependency graph:

| Stage | Contents                        |
| ----- | ------------------------------- |
| `0`   | Package manager (Homebrew)      |
| `1`   | mise                            |
| `2`   | Runtimes installed through mise |
| `3`   | Apps and CLIs                   |

Execution is sequential within and across stages. A failure in stage `0` is fatal; in
the others, the error is collected and execution continues.

### Runner

The interface that runs shell commands. In production it is `Bun.$`; in tests it is a
mock. Every shell access goes through the Runner — no module calls `Bun.$` directly.

### Reporter

The output interface to the terminal, the Runner's counterpart on the other side: just
as no module calls `Bun.$` directly, no command calls `console.*` directly. The command
describes what happened; the Reporter decides how it looks.

Two implementations, picked in `cli.ts` by the environment: `clack-reporter` when
`stdout` is a terminal (a spinner per Tool, a framed summary) and `plain-reporter` for
pipes, files, CI and `TERM=dumb` (one line at a time, no ANSI). See
[ADR-0004](docs/adr/0004-injectable-reporter.md).

_Avoid as a synonym:_ "logger". A Reporter has no levels and no configurable
destinations; it has the closed vocabulary of endings the CLI knows how to report.

### Context (CliContext)

Everything outside a Command that a Command may touch: the Runner (machine), the
Reporter (terminal), the prompts (human), the Platform, the Catalog, the home
directory and the clock. It is assembled once, in `cli.ts` — the composition root —
and handed over as the router's context.

A Command receives `(input, context)` and nothing else: that is what lets the exact
same Command run in a test, against a MockRunner, a MockReporter and a Catalog of three
fake Tools. See [ADR-0005](docs/adr/0005-trpc-cli-router-and-command-per-file.md).

_Avoid as a synonym:_ "container", "dependency injection". The Context resolves
nothing at runtime; it is an object of ready values.

### Command

One CLI command and its whole use case, in a single file (`src/commands/<name>.ts`),
exporting `<name>Command(input, context)`. It resolves the input, decides, runs the
effects and returns **data** — the Reporter prints, and `cli.ts` turns errors into
exit codes.

There is no service, handler or controller layer beneath it: whatever two Commands
share becomes a function in `src/lib/`.

### Router

`src/router.ts`: the whole CLI surface on one screen — each command, its description,
its positionals and its flags, derived from the zod schemas in `src/schemas/`. The
router only **declares** and binds each procedure to its Command; no rule lives in it.

### Unsupported

An explicit declaration that a Tool does not exist on a Platform, along with the
reason (`unsupported('no official Linux client')`). An `unsupported` Tool is
**reported** in the final summary (`⊘`), never skipped silently.

### Configuration

The files a Tool writes once installed: a `root` and the list of files with a relative
path and content, embedded in the binary from `src/dotfiles/<tool>/`. `install` applies
each Tool's Configuration right after installing it or finding it installed;
`uninstall` never touches it. See
[ADR-0006](docs/adr/0006-install-applies-configuration.md).

A file that already matches the disk is not touched (`configuration up to date`). One
that differs is moved into the run's Backup before being rewritten. With `ownsRoot`,
the whole directory belongs to the Configuration and goes into the Backup as a unit.

_Avoid as a synonym:_ "setup", "settings", "dotfiles" as the name of the concept.
"Dotfiles" is only the directory where the content lives.

### Backup

What one run of `install` (or of `restore`) moved out of the way, in
`~/.0xshell/backups/<version>/`. The **version** is the moment of the run
(`YYYYMMDD-HHMMSS`). `manifest.tsv` records each path as `saved` (it existed and was
kept in `files/`) or `created` (it did not exist). `0xshell restore <version>` returns
each path to that state, first keeping the current state in a new version.

_Avoid as a synonym:_ "snapshot" for the folder itself. "Snapshot" only names the
version `restore` creates before restoring.

### Platform

`darwin` | `linux`. They are the only two supported platforms.

### Tag

A grouping label for Tools (`apps`, `runtimes`, `cli`, `shell`), consumed by
`0xshell install --tag <tag>`. Tags do not create commands of their own. `shell`
groups what builds the terminal: zsh, oh-my-zsh, antigen, fzf, eza and carapace.

### doctor

A command that only **checks** and never writes. It runs `isInstalled()` for every Tool
in the Catalog and reports. It is the command for recurring use after day 1.

## Recorded decisions

See `docs/adr/`.
