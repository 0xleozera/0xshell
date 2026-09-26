# Managed by 0xshell: `0xshell install antigen` backs up local edits and
# rewrites this file.

# Load bundles from the default repo (oh-my-zsh)
antigen bundle git
antigen bundle git-extras
antigen bundle command-not-found

# Load bundles from external repos
antigen bundle zsh-users/zsh-completions
antigen bundle zsh-users/zsh-autosuggestions
antigen bundle zsh-users/zsh-syntax-highlighting
antigen bundle agkozak/zsh-z

antigen apply
