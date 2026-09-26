# ADR-0006 — install applies each Tool's Configuration

**Status:** accepted · 2026-09-26 · partly supersedes [ADR-0001](0001-v1-installs-does-not-configure.md)

## Context

[ADR-0001](0001-v1-installs-does-not-configure.md) left configuration for after the
install path was in real use. That moment came through the shell: a new machine with
zsh, oh-my-zsh and antigen installed but no `.zshrc`, no `.antigenrc` and no theme is
still unusable until someone copies the files by hand. The same goes for neovim,
which opens bare without `~/.config/nvim`.

ADR-0001 listed the problems configuration brings: symlink vs. copy, conflicts with an
existing file, backup, drift and secrets. This decision answers each of them for the
first cut (zsh, oh-my-zsh, antigen, eza and neovim), without opening secrets.

## Decision

**A Tool can declare a `configuration`** (`src/lib/configuration.ts`): a `root` and
the list of files, each with a relative path and its content. It is data, not
procedure: the same value serves applying, `--dry-run` and the tests. It is a field of
the Tool, not of the Recipe: the content is the same on both Platforms, and a Tool
that is `unsupported` on a Platform is not configured there.

**`install` applies the Configuration**, right after installing the Tool or finding it
installed, before the next Tool starts. There is no separate `config` command: the
user asked for the configuration flow to go along with installation, and an
already-installed Tool (the zsh that ships with the system) is precisely the most
common case. A configuration failure fails the Tool with the reason
`configuration failed: …`, and the plan carries on.

**Copy, not symlink.** The compiled binary runs on a machine with no checkout of this
repository; the files are embedded in it (`import … with { type: 'text' }`, under
`src/dotfiles/<tool>/`).

**Nothing of the user's is lost.** Before writing, each file is compared with what is
on disk (`cmp`). If they all match, nothing is touched and the Tool's line says
`configuration up to date`. Whatever differs is moved into a versioned **Backup** and
only then rewritten. With `ownsRoot`, the whole directory is the Tool's Configuration
(`~/.config/nvim`): if anything differs, the directory goes into the backup as a unit,
because LazyVim loads every file under `lua/plugins/` and a leftover from the previous
config would keep applying.

**Backups live in `~/.0xshell/backups/<version>/`**, one version per `install` run
(`YYYYMMDD-HHMMSS`, from the clock injected into the Context). Each version has a
`manifest.tsv`, with one line per path, and a `files/` tree mirroring the paths
relative to the home. The line says whether the path existed and was kept (`saved`)
or did not exist and was created by `install` (`created`). That is what makes it
possible to return to the exact state, also removing what `install` created. The line
is written by the same script that moves the file, so an interrupted run leaves a
consistent manifest.

**`0xshell restore <version>` rolls a version back.** Before touching a path, its
current state goes into a new backup, so a restore is itself undone by restoring the
version it reports. The saved copy is copied back, not moved, and the same version can
be restored as many times as needed. Without a version, the command restores nothing
and lists the available versions as a usage error.

**Every write goes through the Runner** ([ADR-0003](0003-injectable-shell-runner.md)),
with the content as an argument (`$1`) of an `sh -c`, never interpolated into the
script.

**Machine-specific settings stay out.** The generated `.zshrc` ends with
`source ~/.zshrc.local`, a file 0xshell never writes.

## Consequences

- `uninstall` still does not touch configuration: ADR-0001's rule holds as it was.
- Editing a managed file by hand works until the next `install`, which keeps the edit
  in a backup and rewrites the 0xshell file. Permanent tweaks belong in the
  repository or, for zsh, in `~/.zshrc.local`.
- `~/.0xshell/backups` only grows: no version is deleted automatically. A retention
  policy is left for when the volume becomes a nuisance.
- `restore` only knows paths inside the home, which is where every Configuration
  lives today.
- `doctor` does not check configuration drift. That is left for when real use asks
  for it.
- The Tools ADR-0001 listed and this ADR does not cover (mise, git, 1Password, Claude
  Code, Cursor, Warp, Raycast, Docker, DBeaver, go, bun/pnpm/yarn) still have no
  Configuration; each one comes in with the same shape when its turn comes. DBeaver
  remains blocked on the decision about secrets.

## Alternatives considered

**A separate `0xshell config` command.** Rejected for this cut: it forces two commands
on a new machine and raises the question "configure what is not installed?". It may
come back if the case of reapplying configuration without going through installation
shows up.

**Symlinks to a dotfiles checkout.** Rejected: it requires cloning the repository on
the new machine and keeping the clone in place forever, against the premise of a
single binary.

**`configure()` as a method on the Recipe.** Rejected: a procedure does not let
`--dry-run` list the files without running it, and it would duplicate the same
content on both Platforms.

**Backup next to the file (`~/.zshrc.backup-<timestamp>`).** Rejected: it scatters
copies across the home and `~/.config`, does not record what `install` created (so
there is no way back to the exact state) and does not group into one version the files
a single run replaced.
