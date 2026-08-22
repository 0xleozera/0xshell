# ADR-0004 — Reporter injetável, com duas renderizações

**Status:** aceita · 2026-08-13

> **Atualização (ADR-0005):** a raiz de composição passou a ser `src/cli.ts` (era
> `index.ts`), e o Reporter chega aos comandos dentro do `CliContext`. Os comandos não
> têm mais Reporter default: ele é sempre injetado, o que elimina a última chance de um
> comando renderizar diferente conforme o ambiente do teste.

## Contexto

Até aqui todo comando escrevia direto no `console`: 27 chamadas de `console.log` /
`console.error` espalhadas por seis arquivos, com um vocabulário de símbolos
(`✓`, `✗`, `⊘`, `=`, `→`) repetido inline em cada um e um `reportOutcome`
praticamente idêntico triplicado entre `install`, `uninstall` e `doctor`.

Isso trazia dois problemas de naturezas diferentes.

O primeiro é de experiência. Um `0xshell install` numa máquina nova roda 23 Tools em
sequência, e um `brew install` sozinho leva minutos. Como a linha de cada Tool só era
impressa **depois** que ele terminava, a CLI passava boa parte do setup em silêncio
absoluto — indistinguível de travada, justamente no comando que existe para ser
deixado rodando sozinho.

O segundo é de acoplamento. Seis arquivos de teste dependiam de
`spyOn(console, 'log')`: os testes estavam presos ao `console` global, não a uma
porta do domínio, então qualquer mudança de apresentação os quebraria em bloco.

O projeto já tinha `@clack/prompts` como dependência, usada só para **entrada**
(o multiselect do `--interactive`, a confirmação do `--all`).

## Decisão

Toda saída passa por uma interface `Reporter`, injetada nos comandos — a mesma forma
que o [ADR-0003](0003-runner-de-shell-injetavel.md) deu ao acesso à máquina. Nenhum
comando chama `console.*`: ele descreve **o que aconteceu** e o Reporter decide como
aquilo aparece.

Cada Tool ganha uma linha aberta **antes** do comando rodar (`onToolStart`, novo hook
do `runInstallPlan`) e fechada com o Outcome dele (`onOutcome`). É o que torna um
`install` longo legível, e é a razão de o hook existir no engine em vez de o comando
imprimir por conta própria.

Duas implementações, escolhidas em `index.ts` pelo ambiente:

- **`clack-reporter`** — terminal interativo. `intro`/`outro` delimitam o run, um
  spinner acompanha cada Tool e vira a linha de resultado dele, o resumo final fecha
  num bloco emoldurado. Usa `@clack/prompts`, que já estava no projeto para os
  prompts: a CLI inteira passa a falar com uma voz visual só.
- **`plain-reporter`** — todo o resto: pipe, arquivo, CI, `TERM=dumb`. Uma linha
  entra, uma linha sai, sem ANSI e sem mover o cursor.

A regra que separa as duas é **decoração cai fora, informação fica**. No plano,
`intro`/`outro` não imprimem nada e o spinner não existe (progresso é uma
affordance de terminal; duplicar a linha de cada Tool num log de CI só atrapalha),
mas cada linha de Tool, cada aviso e o resumo saem literais — com os mesmos símbolos
de antes, byte a byte, e com os erros em `stderr`.

## Consequências

O vocabulário de saída vira dado do domínio, não string solta: as cinco terminações
possíveis de uma linha (`succeed`, `skip`, `noop`, `absent`, `fail`) estão declaradas
na porta, e cada comando escolhe uma. Foi isso que permitiu manter, sem `if`, a
distinção que o `doctor` faz e o `install` não — uma ferramenta faltando é o achado
normal de uma auditoria (`absent`), não uma falha do comando (`fail`).

Os testes passam a poder afirmar sobre o que foi **reportado**, via `MockReporter`,
em vez de sobre glifos e cores de uma renderização específica. Os testes antigos que
espionam o `console` continuam válidos: o Reporter default dos comandos é o plano,
cuja saída é a mesma de antes.

**Na renderização interativa tudo vai para `stdout`, inclusive os erros.** O clack
desenha um fluxo conectado (`│`) e jogar metade dele em `stderr` rasgaria o desenho
no meio. Não se perde nada: essa renderização só é escolhida quando `stdout` é um
terminal, e no instante em que a saída é redirecionada quem assume é o Reporter
plano, que mantém `stderr` separado. Quem faz `2>` nunca está na renderização
interativa.

Duas armadilhas do clack ficam registradas porque não são óbvias:

1. `spinner().start()` assina `SIGINT` e, ao fazer isso, tira do Node a terminação
   padrão. Sem tratamento, um Ctrl+C no meio do `install` apagaria o spinner e
   seguiria instalando os outros vinte Tools. O `clack-reporter` registra o próprio
   encerramento logo depois do `start()`.
2. Cada `log.message()` desenha uma régua em branco antes da mensagem. Bonito para
   três mensagens, péssimo para 23 linhas de catálogo — então `list` e os `--dry-run`
   mandam o bloco inteiro numa chamada só. O texto resultante é idêntico linha a
   linha; muda só o espaçamento na renderização interativa.

## Alternativas consideradas

**Continuar no `console` e só adicionar cor.** Rejeitada: não resolve o silêncio
durante os installs longos, que é o problema real, e mantém o acoplamento dos testes
ao `console` global.

**`consola` no lugar do clack.** Rejeitada: o clack já era dependência do projeto
para os prompts. Trazer uma segunda biblioteca de saída significaria duas estéticas
convivendo na mesma tela — o prompt do `--interactive` numa, o resto do run noutra.

**Uma renderização só, detectando TTY dentro dela.** Rejeitada: a detecção acabaria
espalhada por cada método, e a versão de terminal precisa de coisas (spinner, moldura,
fluxo conectado) que não têm tradução honesta num log. Duas implementações da mesma
porta deixam cada uma coerente consigo.

**O comando decidir a renderização (`resolveReporter()` como default do comando).**
Rejeitada: um comando que olha o `process.stdout` renderiza diferente sob `bun test`
conforme a suíte tenha sido rodada de um terminal ou do CI. A escolha é da raiz de
composição (`index.ts`); o default dos comandos é o Reporter plano, que é
determinístico.
