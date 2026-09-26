# ADR-0001 — v1 installs, it does not configure

**Status:** accepted · 2026-08-12 · the configuration part was superseded by [ADR-0006](0006-install-applies-configuration.md)

## Context

`0xshell` exists to solve "new machine": install the ~22 tools of the setup without
hunting for download links one by one. The natural temptation is for it to also
**configure** what it installed — dotfiles, `~/.config/nvim`, `.zshrc`, mise default
versions. The repository name itself (`0xshell`) hints that shell configuration is on
the horizon.

Installing and configuring, however, are problems with different owners:

- **Installing** is stateless and idempotent by nature: either the binary is on the
  PATH or it is not. The predicate is trivial and re-running is safe.
- **Configuring** is dotfile management: symlink vs. copy, conflicts with a file that
  already exists, backing up what was there before, drift between the machine and the
  repository, secrets (DBeaver connections carry credentials). None of that is
  idempotent for free.

## Decision

v1 **only installs**. The CLI finishes its job at "the tool exists and is
executable". No user configuration file is written, read or moved.

Configuration becomes an initiative of its own, with its own grilling — probably a
`0xshell config` command — once the install path is in real use.

## Consequences

The Tool module contract (see [ADR-0002](0002-thin-module-per-tool.md)) already
reserves the place where `configure()` will live: each Tool is a file of its own
precisely so it can take this second half without a refactor.

**Tools that will need configuration in a later phase** — this is the list that
motivates `0xshell config` and the reason a file per Tool exists from day one:

| Tool                  | What will still need configuring                                  |
| --------------------- | ----------------------------------------------------------------- |
| **shell (zsh)**       | `.zshrc`, aliases, `PATH`, plugins, prompt                        |
| **neovim**            | `~/.config/nvim` — plugins, LSP, keymaps                          |
| **mise**              | global `~/.config/mise/config.toml` (default versions)            |
| **git**               | `.gitconfig`, identity, signing key                               |
| **1Password**         | SSH agent + integration with git commit signing                   |
| **Claude Code**       | `~/.claude/` — settings, skills, MCP servers                      |
| **Cursor**            | settings, keybindings, extensions                                 |
| **Warp**              | settings, theme, keybindings                                      |
| **Raycast**           | extensions and hotkeys                                            |
| **Docker**            | daemon resources, contexts                                        |
| **DBeaver**           | connections — ⚠️ they carry credentials, need a decision on secrets |
| **go**                | `GOPATH`/`GOBIN` on the `PATH`                                    |
| **bun / pnpm / yarn** | registries and the global binaries directory on the `PATH`        |

Accepted consequence: after running `0xshell` on a new machine, the environment is
**installed but raw**. Configuration stays manual until `0xshell config` exists.

**The rule applies in both directions.** v1 also uninstalls, and uninstalling does not
delete user configuration or data: `apt remove` and never `apt purge`,
`brew uninstall --cask` without `--zap`. A CLI that does not know how to write a tool's
configuration has no way of knowing what is safe to delete either. Purging is left to
`0xshell config`, which is what will have that knowledge.

## Alternatives considered

**Install and configure in the same v1.** Rejected: it doubles the scope of the first
cut and drags the project into the hardest problem (dotfiles, conflicts, secrets)
before the easy problem is solved and in use. The concrete risk is the project never
getting used even for installing.
