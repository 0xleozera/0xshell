# CONTEXT — 0xshell

CLI em Bun que instala, numa máquina nova, o conjunto fixo de ferramentas do setup
de desenvolvimento. Suporta macOS (Homebrew) e Linux (apt).

## Glossário

Estes termos têm significado preciso neste projeto. Use-os no código, nos títulos de
issue e nos testes — não drifte para os sinônimos listados como "evitar".

### Tool (Ferramenta)

Unidade instalável do catálogo. Corresponde a exatamente um módulo em
`commands/install/tools/<id>.ts`. Um Tool declara seu `id`, suas `tags`, seu `stage`
e uma receita de instalação por plataforma.

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

### Unsupported

Declaração explícita de que um Tool não existe numa plataforma, acompanhada do
motivo (`unsupported('sem cliente Linux oficial')`). Um Tool `unsupported` é
**reportado** no resumo final (`⊘`), nunca pulado em silêncio.

### Platform (Plataforma)

`darwin` | `linux`. São as duas únicas plataformas suportadas.

Nos comentários de código o termo aparece em inglês (`Platform`); nas mensagens que o
CLI imprime, em português (`plataforma`).

### Tag

Rótulo de agrupamento de Tools (`apps`, `runtimes`, `cli`), consumido por
`0xshell install --tag <tag>`. Tags não criam comandos próprios.

### doctor

Comando que apenas **verifica** e nunca escreve. Roda o `isInstalled()` de cada Tool
do Catálogo e reporta. É o comando de uso recorrente depois do dia 1.

## Decisões registradas

Ver `docs/adr/`.
