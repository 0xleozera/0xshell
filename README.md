# sshell

CLI em Bun que instala, numa máquina nova, o conjunto fixo de ferramentas do setup de
desenvolvimento. Suporta macOS (Homebrew) e Linux (apt).

## Instalação

```sh
curl -fsSL https://raw.githubusercontent.com/0xleozera/sshell/main/install.sh | sh
```

O script detecta a Plataforma (`darwin/arm64` ou `linux/x64`), baixa o binário do
último release e o deixa executável no `PATH`. Não requer Bun nem qualquer outro
runtime instalado.

## Uso

```sh
sshell install                  # instala o catálogo inteiro
sshell install neovim docker    # instala só os Tools nomeados
sshell install --tag apps       # instala os Tools de uma Tag
sshell install --interactive    # escolhe os Tools num multiselect
sshell install --dry-run        # mostra o que seria executado, sem executar
```

## Desenvolvimento

```sh
bun install
bun test
bun run typecheck
bun run build   # gera dist/sshell-darwin-arm64 e dist/sshell-linux-x64
```

Veja `CONTEXT.md` para o glossário do domínio e `docs/adr/` para as decisões
registradas.
