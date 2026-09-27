# ADR-0007 — a Configuration can set single keys in files the app owns

**Status:** accepted · 2026-09-26 · extends [ADR-0006](0006-install-applies-configuration.md)

## Context

Theming everything Gruvbox reached apps whose theme lives in a file the app itself
keeps writing: Warp's `settings.toml` (every Warp preference), Claude Code's
`~/.claude/settings.json` (permissions, plugins, model settings) and Hermes'
`~/.hermes/config.yaml` (model, providers, API setup). ADR-0006 only knows whole
files: writing one of these would wipe the user's settings on every `install`, and the
app would rewrite it anyway.

## Decision

**A Configuration can declare `settings`**: a file, its format (`toml`, `yaml`,
`json`), a section and one key with its value. Only that key is set.

- **TOML and YAML are edited line by line** (an awk program, the values passed as
  variables, never as program text): the key's line is replaced where it is, added at
  the end of its section, or appended with its section header. Comments and layout
  survive. YAML is limited to a top-level mapping with keys two spaces in — what the
  files in the Catalog use; nothing here parses YAML in general.
- **JSON is parsed and written back** with two-space indentation and the keys in their
  original order; JSON has no comments to lose. A file that is not valid JSON is left
  alone and the Tool's configuration fails.
- **Up to date means no change**: the planned file is compared with the one on disk,
  so a set key plans nothing, `--dry-run` included.
- **The backup copies instead of moving**: the app keeps its file (same inode, same
  permissions), and `restore` brings the whole file back, like any other entry.

## Consequences

- Themes for apps that store them next to user data are now in reach without owning
  that data.
- `restore` of such a file returns every key in it to the saved state, not only the
  one 0xshell set — the same unit the backup is taken in.
- Formats beyond these three, or YAML deeper than one level, need a new decision
  rather than a stretch of the line editor.
