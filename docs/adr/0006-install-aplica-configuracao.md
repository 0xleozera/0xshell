# ADR-0006 — O install aplica a Configuração dos Tools

**Status:** aceita · 2026-09-26 · substitui em parte a [ADR-0001](0001-v1-instala-nao-configura.md)

## Contexto

A [ADR-0001](0001-v1-instala-nao-configura.md) deixou a configuração para depois do
caminho de instalação estar em uso real. Esse momento chegou pelo shell: uma máquina
nova com zsh, oh-my-zsh e antigen instalados mas sem `.zshrc`, sem `.antigenrc` e sem
tema continua inutilizável até alguém copiar os arquivos à mão. O mesmo vale para o
neovim, que sem `~/.config/nvim` abre cru.

A ADR-0001 listou os problemas que a configuração traz: symlink vs. cópia, conflito
com arquivo existente, backup, drift e segredos. Esta decisão responde a cada um para o
primeiro corte (zsh, oh-my-zsh, antigen, eza e neovim), sem abrir segredos.

## Decisão

**Um Tool pode declarar uma `configuration`** (`src/lib/configuration.ts`): um `root`
e a lista de arquivos, com caminho relativo e conteúdo. É dado, não procedimento: o
mesmo valor serve para aplicar, para o `--dry-run` e para os testes. É um campo do
Tool, não da Recipe: o conteúdo é o mesmo nas duas Plataformas, e um Tool
`unsupported` numa Plataforma não é configurado nela.

**O `install` aplica a Configuração**, logo depois de instalar o Tool ou de encontrá-lo
instalado, antes do próximo Tool começar. Não existe um comando `config` separado: o
usuário pediu que o fluxo de configuração ande junto com a instalação, e um Tool já
instalado (o zsh que vem com o sistema) é justamente o caso mais comum. Uma falha de
configuração falha o Tool com o motivo `configuração falhou: …`, e o plano segue.

**Cópia, não symlink.** O binário compilado roda numa máquina sem checkout deste
repositório; os arquivos vão embutidos nele (`import … with { type: 'text' }`, sob
`src/dotfiles/<tool>/`).

**Nada do usuário se perde.** Antes de escrever, cada arquivo é comparado com o que
está no disco (`cmp`). Se todos batem, nada é tocado e a linha do Tool diz
`configuração em dia`. O que difere é movido para um **Backup** versionado e só então
reescrito. Com `ownsRoot`, o diretório inteiro é a Configuração do Tool
(`~/.config/nvim`): se algo difere, o diretório vai para o backup como uma unidade,
porque o LazyVim carrega todo arquivo em `lua/plugins/` e uma sobra do config anterior
continuaria valendo.

**Backups vivem em `~/.0xshell/backups/<versão>/`**, uma versão por execução do
`install` (`AAAAMMDD-HHMMSS`, do relógio injetado no Context). Cada versão tem um
`manifest.tsv`, com uma linha por caminho, e um `files/` que espelha os caminhos
relativos à home. A linha diz se o caminho existia e foi guardado (`saved`) ou se não
existia e foi criado pelo `install` (`created`). É isso que permite voltar ao estado
exato, removendo também o que o `install` criou. A linha é gravada no mesmo script que
move o arquivo, então uma execução interrompida deixa um manifesto coerente.

**`0xshell restore <versão>` volta uma versão.** Antes de mexer num caminho, o estado
atual dele vai para um backup novo, então o próprio restore se desfaz restaurando a
versão que ele informa. A cópia guardada é copiada de volta, não movida, e a mesma
versão pode ser restaurada quantas vezes for preciso. Sem versão, o comando não
restaura nada e lista as versões disponíveis como erro de uso.

**Toda escrita passa pelo Runner** ([ADR-0003](0003-runner-de-shell-injetavel.md)),
com o conteúdo como argumento (`$1`) de um `sh -c`, nunca interpolado no script.

**Máquina-específico fica fora.** O `.zshrc` gerado termina com
`source ~/.zshrc.local`, arquivo que o 0xshell nunca escreve.

## Consequências

- O `uninstall` continua sem tocar em configuração: a regra da ADR-0001 vale como
  estava.
- Editar à mão um arquivo gerenciado funciona até o próximo `install`, que guarda a
  edição num backup e reescreve o arquivo do 0xshell. Ajustes permanentes vão para o
  repositório ou, no zsh, para `~/.zshrc.local`.
- `~/.0xshell/backups` só cresce: nenhuma versão é apagada automaticamente. Uma
  política de retenção fica para quando o volume incomodar.
- O `restore` só conhece caminhos dentro da home, e é lá que toda Configuração de hoje
  mora.
- O `doctor` não verifica drift de configuração. Fica para quando houver uso real que
  peça isso.
- Os Tools que a ADR-0001 listou e esta ADR não cobre (mise, git, 1Password, Claude
  Code, Cursor, Warp, Raycast, Docker, DBeaver, go, bun/pnpm/yarn) continuam sem
  Configuração; cada um entra com a mesma forma quando for a vez dele. DBeaver continua
  bloqueado pela decisão sobre segredos.

## Alternativas consideradas

**Comando `0xshell config` separado.** Rejeitada para este corte: obriga a rodar dois
comandos numa máquina nova e cria a pergunta "configurar o que não está instalado?".
Pode voltar se aparecer o caso de reaplicar a configuração sem passar pela instalação.

**Symlink para um checkout de dotfiles.** Rejeitada: exige clonar o repositório na
máquina nova e manter o clone no lugar para sempre, contra a premissa de um binário
único.

**`configure()` como método na Recipe.** Rejeitada: um procedimento não deixa o
`--dry-run` listar os arquivos sem executá-lo, e duplicaria o mesmo conteúdo nas duas
Plataformas.

**Backup ao lado do arquivo (`~/.zshrc.backup-<timestamp>`).** Rejeitada: espalha
cópias pela home e pelo `~/.config`, não registra o que o `install` criou (então não há
como voltar ao estado exato) e não agrupa numa versão os arquivos que uma mesma execução
trocou.
