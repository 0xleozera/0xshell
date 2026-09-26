# 0xshell

CLI em Bun que instala e configura, numa máquina nova, o conjunto fixo de ferramentas do
setup de desenvolvimento. Suporta macOS (Homebrew) e Linux (apt).

## Instalação

```sh
curl -fsSL https://raw.githubusercontent.com/0xleozera/0xshell/main/install.sh | sh
```

O script detecta a Plataforma (`darwin/arm64` ou `linux/x64`), baixa o binário do
último release e o deixa executável no `PATH`. Não requer Bun nem qualquer outro
runtime instalado.

## Uso

```sh
0xshell install                 # instala o catálogo inteiro
0xshell install neovim docker   # instala só os Tools nomeados
0xshell install --tag apps      # instala os Tools de uma Tag
0xshell install --interactive   # escolhe os Tools num multiselect
0xshell install --dry-run       # mostra o que seria executado, sem executar
0xshell install neovim --dry-run  # flags booleanas vêm depois dos ids
0xshell install --tag shell     # zsh, oh-my-zsh, antigen, fzf, eza e carapace
```

## Configuração

Alguns Tools são configurados pelo próprio `install`, logo depois de instalados (ou de
encontrados já instalados). O tema de tudo é o Tokyo Night, estilo `night`.

| Tool        | Arquivos                                                          |
| ----------- | ----------------------------------------------------------------- |
| `zsh`       | `~/.zshrc`, `~/.zprofile`                                         |
| `oh-my-zsh` | `~/.oh-my-zsh/custom/themes/tokyonight.zsh-theme`                 |
| `antigen`   | `~/.antigenrc`                                                    |
| `eza`       | `~/.config/eza/theme.yml`                                         |
| `neovim`    | `~/.config/nvim` (LazyVim), substituído como um diretório inteiro |

Um arquivo que já está igual não é tocado. Um que difere vai para
`~/.0xshell/backups/<versão>/` antes de ser reescrito, e o `install` informa a versão no
final. Ajustes só desta máquina vão em `~/.zshrc.local`, que o 0xshell nunca escreve.
`--dry-run` lista os arquivos que seriam escritos (`✎`).

```sh
0xshell restore                            # lista as versões de backup
0xshell restore 20260926-143012 --dry-run  # mostra o que voltaria
0xshell restore 20260926-143012            # volta os arquivos daquela versão
```

O `restore` devolve cada arquivo ao conteúdo guardado e remove o que aquele `install`
criou. O estado de antes do restore vira uma versão nova, então dá para desfazê-lo com
outro `restore`.

O tema do terminal em si (cores de fundo do Warp, por exemplo) não é configurado: o
prompt e os plugins usam cores truecolor que ficam certas sobre um fundo Tokyo Night.

## Desenvolvimento

```sh
bun install
bun test
bun run typecheck
bun run build   # gera dist/0xshell-darwin-arm64 e dist/0xshell-linux-x64
```

Veja `CONTEXT.md` para o glossário do domínio e `docs/adr/` para as decisões
registradas.
