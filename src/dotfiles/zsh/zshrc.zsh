# Managed by 0xshell: `0xshell install zsh` backs up local edits and rewrites
# this file. Machine-specific settings belong in ~/.zshrc.local, sourced last.

# Path to Oh My Zsh installation
export ZSH="$HOME/.oh-my-zsh"

# Theme: Gruvbox (dark), written to $ZSH/custom/themes by `0xshell install oh-my-zsh`
ZSH_THEME="gruvbox"

# Disable auto-update for Oh My Zsh
export DISABLE_AUTO_UPDATE=true

# History configuration
HISTFILE=~/.zsh_history
HISTSIZE=500000
SAVEHIST=500000

# Keybindings
bindkey -e

# Source Oh My Zsh
[ -f "$ZSH/oh-my-zsh.sh" ] && source "$ZSH/oh-my-zsh.sh"

# User binaries (mise's installer puts mise itself here)
export PATH="$HOME/.local/bin:$PATH"
[ -d /opt/homebrew/opt/libpq/bin ] && export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

# Mise environment manager. Activated before anything below that looks up a
# mise-managed binary.
command -v mise &> /dev/null && eval "$(mise activate zsh)"

# Go environment
command -v go &> /dev/null && export PATH="$PATH:$(go env GOPATH)/bin"

# FZF integration. `fzf --zsh` exists from 0.48 on; the older Debian/Ubuntu
# packages ship the same scripts under /usr/share/doc/fzf/examples instead.
if fzf --zsh &> /dev/null; then
  source <(fzf --zsh)
elif [ -f /usr/share/doc/fzf/examples/key-bindings.zsh ]; then
  source /usr/share/doc/fzf/examples/key-bindings.zsh
fi

# FZF colors: Gruvbox (dark)
export FZF_DEFAULT_OPTS="--color=bg+:#3c3836,bg:#282828,border:#665c54,fg:#ebdbb2,gutter:#282828,header:#fe8019,hl+:#fabd2f,hl:#fabd2f,info:#83a598,marker:#fe8019,pointer:#fb4934,prompt:#8ec07c,query:#ebdbb2,scrollbar:#665c54,separator:#504945,spinner:#fb4934"

# Eza configuration: eza reads theme.yml from this directory
export EZA_CONFIG_DIR=~/.config/eza

# Aliases
alias lsx='eza -l -a --icons'
alias vim=nvim

# Auto-completion
autoload -Uz compinit; compinit

# Carapace auto-completion (if installed)
if command -v carapace &> /dev/null; then
  export CARAPACE_BRIDGES='zsh,fish,bash,inshellisense'
  zstyle ':completion:*' format $'\e[2;37mCompleting %d\e[m'
  source <(carapace _carapace)
fi

# Word navigation with option/alt key (macOS/Linux)
bindkey "^[[1;3D" beginning-of-line  # inside tmux
bindkey "^[[1;3C" end-of-line
bindkey "^[[1;9D" beginning-of-line  # outside tmux
bindkey "^[[1;9C" end-of-line
bindkey "\eOH" beginning-of-line     # raw escape (Cmd+Left)
bindkey "\eOF" end-of-line           # raw escape (Cmd+Right)
bindkey "^[b" backward-word
bindkey "^[f" forward-word

# Antigen plugin manager (load last for proper syntax highlighting)
if [ -f "$HOME/antigen.zsh" ]; then
  source "$HOME/antigen.zsh"
  antigen init ~/.antigenrc
fi

# Plugin colors: Gruvbox (dark). Set after antigen so they override the
# plugins' defaults.
ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=#7c6f64'

typeset -gA ZSH_HIGHLIGHT_STYLES
ZSH_HIGHLIGHT_STYLES[default]='fg=#ebdbb2'
ZSH_HIGHLIGHT_STYLES[unknown-token]='fg=#fb4934'
ZSH_HIGHLIGHT_STYLES[reserved-word]='fg=#d3869b'
ZSH_HIGHLIGHT_STYLES[alias]='fg=#83a598'
ZSH_HIGHLIGHT_STYLES[suffix-alias]='fg=#83a598'
ZSH_HIGHLIGHT_STYLES[global-alias]='fg=#83a598'
ZSH_HIGHLIGHT_STYLES[builtin]='fg=#83a598'
ZSH_HIGHLIGHT_STYLES[function]='fg=#83a598'
ZSH_HIGHLIGHT_STYLES[command]='fg=#83a598'
ZSH_HIGHLIGHT_STYLES[hashed-command]='fg=#83a598'
ZSH_HIGHLIGHT_STYLES[arg0]='fg=#83a598'
ZSH_HIGHLIGHT_STYLES[precommand]='fg=#8ec07c,italic'
ZSH_HIGHLIGHT_STYLES[autodirectory]='fg=#8ec07c,italic'
ZSH_HIGHLIGHT_STYLES[commandseparator]='fg=#fe8019'
ZSH_HIGHLIGHT_STYLES[redirection]='fg=#fe8019'
ZSH_HIGHLIGHT_STYLES[single-hyphen-option]='fg=#fabd2f'
ZSH_HIGHLIGHT_STYLES[double-hyphen-option]='fg=#fabd2f'
ZSH_HIGHLIGHT_STYLES[single-quoted-argument]='fg=#b8bb26'
ZSH_HIGHLIGHT_STYLES[double-quoted-argument]='fg=#b8bb26'
ZSH_HIGHLIGHT_STYLES[dollar-quoted-argument]='fg=#b8bb26'
ZSH_HIGHLIGHT_STYLES[back-quoted-argument]='fg=#d3869b'
ZSH_HIGHLIGHT_STYLES[dollar-double-quoted-argument]='fg=#8ec07c'
ZSH_HIGHLIGHT_STYLES[command-substitution-delimiter]='fg=#d3869b'
ZSH_HIGHLIGHT_STYLES[globbing]='fg=#fe8019'
ZSH_HIGHLIGHT_STYLES[history-expansion]='fg=#fe8019'
ZSH_HIGHLIGHT_STYLES[path]='fg=#ebdbb2,underline'
ZSH_HIGHLIGHT_STYLES[comment]='fg=#928374'

# Machine-specific settings, never touched by 0xshell
[ -f ~/.zshrc.local ] && source ~/.zshrc.local
