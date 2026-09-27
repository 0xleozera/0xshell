# 0xshell

A Bun CLI that installs and configures, on a new machine, the fixed set of tools of the
development setup. Supports macOS (Homebrew) and Linux (apt).

## Installation

```sh
curl -fsSL https://raw.githubusercontent.com/0xleozera/0xshell/main/install.sh | sh
```

The script detects the Platform (`darwin/arm64` or `linux/x64`), downloads the binary
from the latest release and leaves it executable on the `PATH`. It needs neither Bun
nor any other runtime installed.

## Usage

```sh
0xshell install                 # installs the whole Catalog
0xshell install neovim docker   # installs only the named Tools
0xshell install --tag apps      # installs the Tools of one Tag
0xshell install --interactive   # picks the Tools in a multiselect
0xshell install --dry-run       # shows what would run, without running it
0xshell install neovim --dry-run  # boolean flags come after the ids
0xshell install --tag shell     # zsh, oh-my-zsh, antigen, fzf, eza and carapace
0xshell uninstall docker        # removes the named Tools (never their configuration)
0xshell uninstall --all         # removes the whole Catalog but mise, after asking
0xshell uninstall --all --yes   # the same, without asking (scripts)
```

## Configuration

Some Tools are configured by `install` itself, right after they are installed (or
found already installed). Everything is themed Gruvbox, dark with medium contrast
(background `#282828`).

| Tool           | Files                                                              |
| -------------- | ------------------------------------------------------------------ |
| `zsh`          | `~/.zshrc` (fzf and plugin colors), `~/.zprofile`                  |
| `oh-my-zsh`    | `~/.oh-my-zsh/custom/themes/gruvbox.zsh-theme`                     |
| `antigen`      | `~/.antigenrc`                                                     |
| `eza`          | `~/.config/eza/theme.yml`                                          |
| `neovim`       | `~/.config/nvim` (LazyVim + gruvbox.nvim), replaced as a whole     |
| `warp`         | `theme = "gruvbox_dark"` in `settings.toml`, that key only         |
| `claude-code`  | `"theme": "dark-ansi"` in `~/.claude/settings.json`, that key only |
| `hermes-agent` | `~/.hermes/skins/gruvbox.yaml`; `display.skin` in `config.yaml`    |

Warp, Claude Code and Hermes keep all their other settings in those same files, so
0xshell sets the one key and leaves every other line as it was. Claude Code has no
Gruvbox of its own: its ANSI theme draws with the terminal's palette, which is Warp's
Gruvbox Dark.

A file that already matches is not touched. One that differs goes to
`~/.0xshell/backups/<version>/` before being rewritten, and `install` prints the
version at the end. Settings for this machine only go in `~/.zshrc.local`, which
0xshell never writes. `--dry-run` lists the files that would be written, and the keys
that would be set (`✎`). A file where a key is set is copied into the backup first.

```sh
0xshell restore                            # lists the backup versions
0xshell restore 20260926-143012 --dry-run  # shows what would come back
0xshell restore 20260926-143012            # brings back the files of that version
```

`restore` returns each file to its saved content and removes what that `install`
created. The state before the restore becomes a new version, so it can be undone with
another `restore`.

## Development

```sh
bun install
bun test
bun run typecheck
bun run build   # produces dist/0xshell-darwin-arm64 and dist/0xshell-linux-x64
```

See `CONTEXT.md` for the domain glossary and `docs/adr/` for the recorded decisions.
