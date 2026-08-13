# 0xshell

CLI em Bun que instala, numa máquina nova, o conjunto fixo de ferramentas do setup de
desenvolvimento. Suporta macOS (Homebrew) e Linux (apt).

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
```

## Desenvolvimento

```sh
bun install
bun test
bun run typecheck
bun run build   # gera dist/0xshell-darwin-arm64 e dist/0xshell-linux-x64
```

Veja `CONTEXT.md` para o glossário do domínio e `docs/adr/` para as decisões
registradas.
