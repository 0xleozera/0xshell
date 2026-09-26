# Managed by 0xshell: `0xshell install zsh` backs up local edits and rewrites
# this file. Machine-specific settings belong in ~/.zshrc.local, sourced last.

# Path to Oh My Zsh installation
export ZSH="$HOME/.oh-my-zsh"

# Theme: Tokyo Night, written to $ZSH/custom/themes by `0xshell install oh-my-zsh`
ZSH_THEME="tokyonight"

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

# FZF colors: Tokyo Night (night)
export FZF_DEFAULT_OPTS="--color=bg+:#283457,bg:#16161e,border:#27a1b9,fg:#c0caf5,gutter:#16161e,header:#ff9e64,hl+:#2ac3de,hl:#2ac3de,info:#545c7e,marker:#ff007c,pointer:#ff007c,prompt:#2ac3de,query:#c0caf5,scrollbar:#27a1b9,separator:#ff9e64,spinner:#ff007c"

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

# Plugin colors: Tokyo Night (night). Set after antigen so they override the
# plugins' defaults.
ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=#565f89'

typeset -gA ZSH_HIGHLIGHT_STYLES
ZSH_HIGHLIGHT_STYLES[default]='fg=#c0caf5'
ZSH_HIGHLIGHT_STYLES[unknown-token]='fg=#f7768e'
ZSH_HIGHLIGHT_STYLES[reserved-word]='fg=#bb9af7'
ZSH_HIGHLIGHT_STYLES[alias]='fg=#7aa2f7'
ZSH_HIGHLIGHT_STYLES[suffix-alias]='fg=#7aa2f7'
ZSH_HIGHLIGHT_STYLES[global-alias]='fg=#7aa2f7'
ZSH_HIGHLIGHT_STYLES[builtin]='fg=#7aa2f7'
ZSH_HIGHLIGHT_STYLES[function]='fg=#7aa2f7'
ZSH_HIGHLIGHT_STYLES[command]='fg=#7aa2f7'
ZSH_HIGHLIGHT_STYLES[hashed-command]='fg=#7aa2f7'
ZSH_HIGHLIGHT_STYLES[arg0]='fg=#7aa2f7'
ZSH_HIGHLIGHT_STYLES[precommand]='fg=#7dcfff,italic'
ZSH_HIGHLIGHT_STYLES[autodirectory]='fg=#7dcfff,italic'
ZSH_HIGHLIGHT_STYLES[commandseparator]='fg=#89ddff'
ZSH_HIGHLIGHT_STYLES[redirection]='fg=#89ddff'
ZSH_HIGHLIGHT_STYLES[single-hyphen-option]='fg=#e0af68'
ZSH_HIGHLIGHT_STYLES[double-hyphen-option]='fg=#e0af68'
ZSH_HIGHLIGHT_STYLES[single-quoted-argument]='fg=#9ece6a'
ZSH_HIGHLIGHT_STYLES[double-quoted-argument]='fg=#9ece6a'
ZSH_HIGHLIGHT_STYLES[dollar-quoted-argument]='fg=#9ece6a'
ZSH_HIGHLIGHT_STYLES[back-quoted-argument]='fg=#bb9af7'
ZSH_HIGHLIGHT_STYLES[dollar-double-quoted-argument]='fg=#7dcfff'
ZSH_HIGHLIGHT_STYLES[command-substitution-delimiter]='fg=#bb9af7'
ZSH_HIGHLIGHT_STYLES[globbing]='fg=#ff9e64'
ZSH_HIGHLIGHT_STYLES[history-expansion]='fg=#ff9e64'
ZSH_HIGHLIGHT_STYLES[path]='fg=#c0caf5,underline'
ZSH_HIGHLIGHT_STYLES[comment]='fg=#565f89'

# Machine-specific settings, never touched by 0xshell
[ -f ~/.zshrc.local ] && source ~/.zshrc.local
