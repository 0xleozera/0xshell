# Tokyo Night (night) take on robbyrussell. Hex colors need zsh >= 5.7 and a
# truecolor terminal.

PROMPT="%(?:%F{#9ece6a}%1{➜%} :%F{#f7768e}%1{➜%} )%F{#7dcfff}%c%f"
PROMPT+=' $(git_prompt_info)'

ZSH_THEME_GIT_PROMPT_PREFIX="%F{#7aa2f7}git:(%F{#bb9af7}"
ZSH_THEME_GIT_PROMPT_SUFFIX="%f "
ZSH_THEME_GIT_PROMPT_DIRTY="%F{#7aa2f7}) %F{#e0af68}%1{✗%}"
ZSH_THEME_GIT_PROMPT_CLEAN="%F{#7aa2f7})"
