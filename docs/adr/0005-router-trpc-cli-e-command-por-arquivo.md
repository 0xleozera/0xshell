# ADR-0005 — Router trpc-cli + zod, um Command por arquivo

**Status:** aceita · 2026-08-21

## Contexto

A CLI nasceu com `citty`: cada comando era uma fábrica (`createInstallCommand(runner,
platform, options)`) que devolvia um objeto `defineCommand`, com a declaração dos
argumentos, a validação e o caso de uso todos dentro do mesmo `run()`. Em volta deles
o código estava organizado por **tipo de peça** — `engine/`, `helpers/`, `runner/`,
`reporter/`, `tool/`, `sudo/` — e o que era comando estava disperso em diretórios com
`index.ts` mais arquivos satélites (`commands/install/index.ts`, `dry-run.ts`,
`prompt-tools.ts`, `catalog.ts`).

Três consequências concretas:

1. **A superfície do CLI não cabia numa leitura.** Para saber quais flags existem era
   preciso abrir quatro arquivos e ler quatro blocos `args` no meio da lógica.
2. **A declaração dos argumentos e o tipo deles eram fontes separadas.** O `args` do
   citty descrevia a flag; o corpo de `run()` lia `args.tag` e `args._` na mão, com a
   validação de cada valor espalhada pelo comando.
3. **O exit code era efeito colateral.** Cada comando escrevia `process.exitCode = 1`
   direto, com o número literal no meio do caso de uso, e um erro de uso (nome de Tool
   inexistente) era indistinguível de uma falha de execução: os dois saíam `1`.

## Decisão

Adotar a arquitetura da skill `nodejs-cli-architecture`, que resolve os três pontos
com a mesma ideia: **o comando é o caso de uso, e o router só declara**.

- **`src/router.ts`** — a superfície inteira numa tela: um procedure por comando, com
  descrição, schema de entrada e uma linha amarrando cada um ao seu Command. Nenhuma
  regra, nenhum `await`, nenhum branch.
- **`src/schemas/commands.ts`** — os schemas zod são a única fonte de verdade da
  entrada. Flags, positionals, defaults, `--help` e as mensagens de validação saem
  todos deles; os tipos são inferidos com `z.infer`, nunca escritos à mão.
- **`src/commands/<nome>.ts`** — um comando, um arquivo, o caso de uso inteiro:
  resolve a entrada, decide, executa e **devolve dados**. Sem camada de service,
  handler ou controller embaixo.
- **`src/lib/`** — todo o resto: efeitos (Runner, Reporter, sudo), o Catálogo, os
  Helpers e as decisões puras que dois comandos compartilham (`select-tools`,
  `stage-order`, `summary`, `dry-run`).
- **`src/prompts/tools.ts`** — as perguntas, e só elas. Um prompt recebe por parâmetro
  tudo que precisa para se formular e não decide nada.
- **`src/lib/errors.ts`** — um tipo de erro (`CliError`) e uma tabela de exit codes:
  `failed` → 1, `usage` → 2, `cancelled` → 130. Nenhum comando conhece um número.
- **`src/cli.ts`** — a raiz de composição e o bin: monta o Context, roda o router e é
  o único lugar que traduz erro (ou resultado) em exit code.

O `citty` sai e entram `trpc-cli` + `@trpc/server`. Dois parsers convivendo seria a
pior das opções — a mesma flag declarada em dois lugares, divergindo na primeira
mudança.

### O Context

O ADR-0003 (Runner injetável) e o ADR-0004 (Reporter injetável) estabeleceram a regra
que este projeto segue desde o começo: **toda costura com o mundo externo é injetada
na raiz de composição**, nunca alcançada de dentro do comando. A skill, por padrão,
faz o comando importar os efeitos direto de `lib/` — o que aqui significaria testar
`install` contra o `brew` da máquina real.

Então a injeção fica, agora consolidada num objeto só, entregue como contexto do tRPC:

```
CliContext = { runner, reporter, platform, catalog, prompts }
```

Um Command recebe `(input, context)`. É a única divergência deliberada em relação à
skill, e ela é o que mantém a suíte inteira rodando sem tocar na máquina — inclusive a
terceira costura, a humana: os prompts entram pelo Context como as outras duas, o que
deixa `--interactive` e `--all` testáveis sem simular um terminal.

### Cancelamento

Um prompt cancelado (Ctrl+C) deixa de ser tratado como "resposta vazia" e vira
`CliError('cancelled')` → exit `130`, o que o shell espera de um `^C`. Antes, cancelar
o multiselect do `--interactive` saía `0`, indistinguível de "não selecionei nada", e
cancelar a confirmação do `--all` era idêntico a responder "não".

## Consequências

O `--help` passa a ser gerado dos schemas, com defaults e restrições visíveis, e a
validação de entrada acontece **antes** do comando rodar. Um nome de Tool inexistente
agora sai `2` (invocação errada) e uma instalação que falhou sai `1` — um script pode
distinguir os dois.

Os comandos devolvem dados (`{ summary, outcomes }`, `{ plan }`, `{ tools }`) em vez
de imprimir e sumir. Quem lê o `summary.failed` e escolhe o exit code é o `cli.ts`.

**Flags booleanas do trpc-cli aceitam valor opcional** (`--dry-run [boolean]`), então
`0xshell install --dry-run neovim` faz o commander engolir `neovim` como valor da
flag e falhar na validação, com mensagem clara. A forma que funciona é
`0xshell install neovim --dry-run` — ou a flag no fim, como está no README. É o único
recuo de superfície da migração, e é barulhento, não silencioso.

O bin passa a ser `src/cli.ts` (era `src/index.ts`); `package.json` e os scripts de
build acompanham. A escolha do Reporter pelo ambiente, descrita no ADR-0004 como
acontecendo em `index.ts`, acontece agora em `cli.ts` — mesma raiz de composição, outro
nome de arquivo.

Fica **de fora**, deliberadamente, a guarda de TTY que a skill pede para os prompts
(`isInteractive()`): sem terminal e sem flag, o certo seria um erro de uso nomeando a
flag em vez de um prompt que trava o pipeline. É mudança de comportamento, não
reorganização, e por isso não entrou nesta refatoração.

## Alternativas consideradas

**Manter o citty e só reorganizar as pastas.** Rejeitada: metade do ganho está em
declarar a superfície fora do caso de uso, e o citty não deriva flags, `--help` nem
validação de um schema — continuariam sendo duas fontes de verdade.

**Seguir a skill à risca e importar os efeitos direto de `lib/` nos comandos.**
Rejeitada: contradiz o ADR-0003 e o ADR-0004, e o custo é a suíte inteira — testar
`install` passaria a exigir uma máquina descartável por execução, exatamente o que
aquele ADR existe para evitar.

**Passar o Runner e o Reporter como parâmetros soltos do Command
(`installCommand(input, runner, reporter, platform, catalog)`).** Rejeitada: cinco
parâmetros posicionais que crescem a cada costura nova, e nenhum lugar onde a lista
esteja escrita uma vez só.
