# Managed by 0xshell: `0xshell install zsh` backs up local edits and rewrites
# this file.

# Homebrew on Apple Silicon lives outside the default PATH.
[ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"

# User binaries (mise, claude, hermes) for login shells too. Installers look
# for this line before adding their own copy to this file.
case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) export PATH="$HOME/.local/bin:$PATH" ;; esac
