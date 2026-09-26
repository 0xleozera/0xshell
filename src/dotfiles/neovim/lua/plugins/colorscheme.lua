return {
  {
    "folke/tokyonight.nvim",
    -- LazyVim defaults tokyonight to "moon"; "night" is the darkest style.
    opts = { style = "night" },
  },
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "tokyonight",
    },
  },
}
