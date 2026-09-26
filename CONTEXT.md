# CONTEXT — 0xshell

CLI em Bun que instala e configura, numa máquina nova, o conjunto fixo de ferramentas
do setup de desenvolvimento. Suporta macOS (Homebrew) e Linux (apt).

## Glossário

Estes termos têm significado preciso neste projeto. Use-os no código, nos títulos de
issue e nos testes — não drifte para os sinônimos listados como "evitar".

### Tool (Ferramenta)

Unidade instalável do catálogo. Corresponde a exatamente um módulo em
`src/lib/tools/<id>.ts`. Um Tool declara seu `id`, suas `tags`, seu `stage`,
uma receita de instalação por plataforma e, opcionalmente, sua Configuração.

_Evitar como sinônimo:_ "package", "dependency", "app". Um Tool pode ser um app de
GUI, um binário de CLI ou um runtime — a palavra é a mesma.

### Catalog (Catálogo)

O conjunto de todos os Tools registrados. É a única fonte de verdade sobre o que o
`0xshell` instala. `0xshell list` imprime o Catálogo com o status por plataforma.

Nos comentários de código o termo aparece em inglês (`Catalog`); nas mensagens que o
CLI imprime, em português (`Catálogo`).

### Helper

Função que constrói a receita de instalação de um Tool para uma plataforma:
`brewCask`, `brewFormula`, `apt`, `aptRepo`, `mise`, `dmg`, `appImage`, `script`,
`custom`.

Um Helper carrega três coisas: o `install()`, o `uninstall()` par dele, e o
`isInstalled()` default daquele meio (ex.: `brewCask` checa `brew list --cask <id>`).
O módulo do Tool pode sobrescrever qualquer um dos três.

### Stage

Fase fixa de execução, de `0` a `3`. Substitui um grafo de dependências:

| Stage | Conteúdo                              |
| ----- | ------------------------------------- |
| `0`   | Gerenciador de pacotes (Homebrew)     |
| `1`   | mise                                  |
| `2`   | Runtimes instalados via mise          |
| `3`   | Apps e CLIs                           |

Execução é sequencial dentro e entre stages. Falha no stage `0` é fatal; nas demais,
o erro é coletado e a execução continua.

### Runner

Interface de execução de comandos de shell. Em produção é `Bun.$`; nos testes é um
mock. Todo acesso ao shell passa pelo Runner — nenhum módulo chama `Bun.$` direto.

### Reporter

Interface de saída para o terminal, o par do Runner do outro lado: assim como nenhum
módulo chama `Bun.$` direto, nenhum comando chama `console.*` direto. O comando
descreve o que aconteceu; o Reporter decide como aquilo aparece.

Duas implementações, escolhidas em `cli.ts` pelo ambiente: `clack-reporter` quando
`stdout` é um terminal (spinner por Tool, resumo emoldurado) e `plain-reporter` para
pipe, arquivo, CI e `TERM=dumb` (uma linha por vez, sem ANSI). Ver
[ADR-0004](docs/adr/0004-reporter-injetavel.md).

_Evitar como sinônimo:_ "logger". Um Reporter não tem níveis nem destinos
configuráveis; ele tem o vocabulário fechado de terminações que o CLI sabe reportar.

### Context (CliContext)

Tudo que está fora de um Command e que um Command pode tocar: o Runner (máquina), o
Reporter (terminal), os prompts (humano), a Platform e o Catálogo. É montado uma única
vez em `cli.ts` — a raiz de composição — e entregue como contexto do router.

Um Command recebe `(input, context)` e nada mais: é isso que permite rodar exatamente o
mesmo Command num teste, contra um MockRunner, um MockReporter e um Catálogo de três
Tools falsos. Ver [ADR-0005](docs/adr/0005-router-trpc-cli-e-command-por-arquivo.md).

_Evitar como sinônimo:_ "container", "injeção de dependência". O Context não resolve
nada em tempo de execução; ele é um objeto de valores prontos.

### Command

Um comando do CLI e o caso de uso inteiro dele, num arquivo só
(`src/commands/<nome>.ts`), exportando `<nome>Command(input, context)`. Resolve a
entrada, decide, executa os efeitos e devolve **dados** — quem imprime é o Reporter,
quem traduz erro em exit code é o `cli.ts`.

Não existe camada de service, handler ou controller abaixo dele: o que dois Commands
compartilham vira função em `src/lib/`.

### Router

`src/router.ts`: a superfície inteira do CLI numa tela — cada comando, sua descrição,
seus positionals e suas flags, derivados dos schemas zod em `src/schemas/`. O router
apenas **declara** e amarra cada procedure ao seu Command; nenhuma regra mora nele.

### Unsupported

Declaração explícita de que um Tool não existe numa plataforma, acompanhada do
motivo (`unsupported('sem cliente Linux oficial')`). Um Tool `unsupported` é
**reportado** no resumo final (`⊘`), nunca pulado em silêncio.

### Configuration (Configuração)

Os arquivos que um Tool escreve depois de instalado: um `root` e a lista de arquivos
com caminho relativo e conteúdo, embutidos no binário a partir de
`src/dotfiles/<tool>/`. O `install` aplica a Configuração de cada Tool logo depois de
instalá-lo ou de encontrá-lo instalado; o `uninstall` nunca a toca. Ver
[ADR-0006](docs/adr/0006-install-aplica-configuracao.md).

Um arquivo que já bate com o disco não é tocado (`configuração em dia`). Um que difere
é movido para o Backup da execução antes de ser reescrito. Com `ownsRoot`, o diretório
inteiro é da Configuração e vai para o Backup como uma unidade.

_Evitar como sinônimo:_ "setup", "settings", "dotfiles" como nome do conceito.
"Dotfiles" é só o diretório onde o conteúdo mora.

### Backup

O que uma execução de `install` (ou de `restore`) tirou do caminho, em
`~/.0xshell/backups/<versão>/`. A **versão** é o instante da execução
(`AAAAMMDD-HHMMSS`). O `manifest.tsv` registra cada caminho como `saved` (existia e foi
guardado em `files/`) ou `created` (não existia). `0xshell restore <versão>` devolve
cada caminho a esse estado, guardando antes o estado atual numa versão nova.

_Evitar como sinônimo:_ "snapshot" para a pasta em si. "Snapshot" só aparece para a
versão que o `restore` cria antes de restaurar.

### Platform (Plataforma)

`darwin` | `linux`. São as duas únicas plataformas suportadas.

Nos comentários de código o termo aparece em inglês (`Platform`); nas mensagens que o
CLI imprime, em português (`plataforma`).

### Tag

Rótulo de agrupamento de Tools (`apps`, `runtimes`, `cli`, `shell`), consumido por
`0xshell install --tag <tag>`. Tags não criam comandos próprios. `shell` agrupa o que
monta o terminal: zsh, oh-my-zsh, antigen, fzf, eza e carapace.

### doctor

Comando que apenas **verifica** e nunca escreve. Roda o `isInstalled()` de cada Tool
do Catálogo e reporta. É o comando de uso recorrente depois do dia 1.

## Decisões registradas

Ver `docs/adr/`.
