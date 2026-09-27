# Gruvbox (dark) take on robbyrussell. Hex colors need zsh >= 5.7 and a
# truecolor terminal.

PROMPT="%(?:%F{#b8bb26}%1{➜%} :%F{#fb4934}%1{➜%} )%F{#8ec07c}%c%f"
PROMPT+=' $(git_prompt_info)'

ZSH_THEME_GIT_PROMPT_PREFIX="%F{#83a598}git:(%F{#d3869b}"
ZSH_THEME_GIT_PROMPT_SUFFIX="%f "
ZSH_THEME_GIT_PROMPT_DIRTY="%F{#83a598}) %F{#fabd2f}%1{✗%}"
ZSH_THEME_GIT_PROMPT_CLEAN="%F{#83a598})"
