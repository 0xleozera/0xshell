# ADR-0003 — Runner de shell injetável

**Status:** aceita · 2026-08-12

> **Atualização (ADR-0005):** o Runner passou a ser entregue aos comandos dentro do
> `CliContext`, montado em `src/cli.ts`. A decisão em si — todo acesso ao shell passa
> por uma interface injetável — segue valendo sem mudança.

## Contexto

O trabalho inteiro do `0xshell` é mutar a máquina: instalar o Homebrew, rodar
`brew install --cask`, `sudo apt install`, montar `.dmg`. Um CLI assim não tem teste
unitário óbvio — não dá para rodar `apt install` num teste, e testar de verdade
exigiria uma máquina descartável por execução.

A consequência de não testar é específica e cara: o erro mais provável no projeto é
**um nome de cask ou de pacote digitado errado**, e sem testes ele só aparece na
máquina nova, durante o setup — exatamente o momento em que o custo de descobrir um
bug é máximo e a paciência é mínima.

## Decisão

Todo acesso ao shell passa por uma interface `Runner`. Em produção ela é implementada
com `Bun.$`; nos testes, por um mock. Nenhum módulo de Tool chama `Bun.$` direto.

Com isso, o que passa a ser testável sem tocar na máquina:

- o schema zod de `defineTool` e a validação do catálogo
- a resolução de plataforma (`darwin` / `linux` / `unsupported`)
- a ordenação por `stage`
- os comandos que cada Helper **produz** — é aqui que o nome de cask errado morre
- a política de falha: stage 0 fatal, demais coletadas
- o resumo final e o exit code

## Consequências

Uma indireção a mais entre o módulo e o shell. É o custo direto desta decisão e é
pequeno: os Helpers já são o ponto de passagem natural, então o `Runner` entra neles
e os módulos de Tool nem o veem.

Testes de integração reais **ficam de fora** — deliberadamente, não por esquecimento.
Rodar o caminho Linux num container de CI é barato e vale como iniciativa própria; o
caminho macOS é inviável em CI. A cobertura aqui é a de unidade, sobre o `Runner`
mockado.

Corolário que precisa ser respeitado: se algum módulo chamar `Bun.$` diretamente, ele
sai da malha de testes sem nenhum sinal de erro. Vale uma regra de lint quando o
projeto crescer.

## Alternativas consideradas

**Sem testes — "é um script pessoal".** Rejeitada: é um script pessoal cuja falha
acontece no pior momento possível, com o custo de depuração inflado por estar numa
máquina que ainda não tem ferramenta nenhuma.

**Testes de integração em container desde o v1.** Rejeitada para o primeiro corte:
cobre só metade das plataformas, é lento, e não pega mais erros de nome de pacote do
que o teste de unidade sobre o `Runner` já pega.
