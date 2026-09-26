# ADR-0001 — O v1 instala, não configura

**Status:** aceita · 2026-08-12 · a parte de configuração foi substituída pela [ADR-0006](0006-install-aplica-configuracao.md)

## Contexto

O `0xshell` nasce para resolver "máquina nova": instalar as ~22 ferramentas do setup
sem catar link por link. A tentação natural é que ele também **configure** o que
instalou — dotfiles, `~/.config/nvim`, `.zshrc`, versões default do mise. O próprio
nome do repositório (`0xshell`) sugere que a configuração de shell está no horizonte.

Instalar e configurar, porém, são problemas com donos diferentes:

- **Instalar** é sem estado e idempotente por natureza: ou o binário está no PATH, ou
  não está. O predicado é trivial e a reexecução é segura.
- **Configurar** é gerenciamento de dotfiles: symlink vs. cópia, conflito com arquivo
  já existente, backup do que havia antes, drift entre a máquina e o repositório,
  segredos (as conexões do DBeaver carregam credenciais). Nada disso é idempotente
  de graça.

## Decisão

O v1 **apenas instala**. O CLI termina seu trabalho em "a ferramenta existe e é
executável". Nenhum arquivo de configuração do usuário é escrito, lido ou movido.

A configuração vira uma iniciativa própria, com seu próprio grilling — provavelmente
um comando `0xshell config` — depois que o caminho de instalação estiver em uso real.

## Consequências

O contrato do módulo de Tool (ver [ADR-0002](0002-modulo-fino-por-ferramenta.md)) já
reserva o lugar onde o `configure()` vai morar: cada Tool é um arquivo próprio
justamente para receber essa segunda metade sem refatoração.

**Ferramentas que vão exigir configuração numa fase futura** — esta é a lista que
motiva o `0xshell config` e o motivo de o arquivo por Tool existir desde já:

| Ferramenta            | O que ficará faltando configurar                                |
| --------------------- | --------------------------------------------------------------- |
| **shell (zsh)**       | `.zshrc`, aliases, `PATH`, plugins, prompt                        |
| **neovim**            | `~/.config/nvim` — plugins, LSP, keymaps                          |
| **mise**              | `~/.config/mise/config.toml` global (versões default)             |
| **git**               | `.gitconfig`, identidade, chave de assinatura                     |
| **1Password**         | SSH agent + integração com assinatura de commits do git           |
| **Claude Code**       | `~/.claude/` — settings, skills, MCP servers                      |
| **Cursor**            | settings, keybindings, extensões                                  |
| **Warp**              | settings, tema, keybindings                                       |
| **Raycast**           | extensões e hotkeys                                               |
| **Docker**            | recursos do daemon, contextos                                     |
| **DBeaver**           | conexões — ⚠️ carregam credenciais, exigem decisão sobre segredos |
| **go**                | `GOPATH`/`GOBIN` no `PATH`                                        |
| **bun / pnpm / yarn** | registries e diretório global de binários no `PATH`               |

Consequência aceita: depois de rodar o `0xshell` numa máquina nova, o ambiente está
**instalado mas cru**. A configuração continua manual até o `0xshell config` existir.

**A regra vale nas duas direções.** O v1 também desinstala, e desinstalar não apaga
configuração nem dados do usuário: `apt remove` e nunca `apt purge`, `brew uninstall
--cask` sem `--zap`. Um CLI que não sabe escrever a configuração de uma ferramenta
também não tem como saber o que é seguro apagar. Purga fica para o `0xshell config`,
que é quem terá esse conhecimento.

## Alternativas consideradas

**Instalar e configurar no mesmo v1.** Rejeitada: dobra o escopo do primeiro corte e
arrasta o projeto para o problema mais difícil (dotfiles, conflitos, segredos) antes
de o problema fácil estar resolvido e em uso. O risco concreto é o projeto não chegar
a ser usado nem para instalar.
