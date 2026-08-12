# ADR-0002 — Um módulo fino por ferramenta, sobre helpers compartilhados

**Status:** aceita · 2026-08-12

## Contexto

O catálogo tem ~22 Tools, e eles caem em pouquíssimos padrões de instalação: cask do
Homebrew, formula do Homebrew, pacote apt, repositório apt de terceiro, tool do mise,
`.dmg` baixado direto. Duas arquiteturas se apresentavam:

- **Catálogo declarativo**: um array validado por zod com uma _discriminated union_ de
  `kind`, e um executor genérico por `kind`. Adicionar ferramenta = adicionar uma
  linha de dado. Menos código, mas o catálogo inteiro é uma estrutura só.
- **Um módulo por ferramenta**: um arquivo por Tool, cada um com sua receita.

Pela ótica exclusiva da instalação, o catálogo declarativo ganha com folga: ele evita
22 arquivos que seriam 90% a mesma chamada de `brew install --cask`.

O fator decisivo veio de fora da instalação. [ADR-0001](0001-v1-instala-nao-configura.md)
deixa a configuração para uma fase futura, e essa fase é intrinsecamente **específica
por ferramenta** — o `configure()` do neovim não tem forma comum com o do 1Password.
Num catálogo declarativo, essa fase não teria onde morar sem quebrar a estrutura.

## Decisão

Um módulo por Tool em `commands/install/tools/<id>.ts`, mas **fino**: o corpo é dado,
não procedimento. A receita vem de Helpers compartilhados.

```ts
export default defineTool({
  id: 'slack',
  tags: ['apps'],
  stage: 3,
  darwin: brewCask('slack'),
  linux: aptRepo({ ... }),
})
```

Helpers: `brewCask`, `brewFormula`, `apt`, `aptRepo`, `mise`, `dmg`, `script`,
`custom`. Cada Helper carrega o `isInstalled()` default do seu meio de instalação, e
o módulo pode sobrescrevê-lo. Um Tool que não existe numa plataforma declara
`unsupported(motivo)` — que é reportado no resumo, nunca silencioso.

Ordem de execução vem do campo `stage` (0–3), não de um grafo de dependências: são 22
nós com duas arestas reais, e ordenação topológica genérica seria maquinário para um
problema que o projeto não tem.

## Consequências

O repositório terá ~22 arquivos de cinco linhas cada. **Isso é intencional** — não é
boilerplate acidental esperando ser extraído. Quem for "limpar" isso colapsando o
catálogo numa estrutura de dados estará desfazendo esta decisão, e deve reabrir a
ADR-0001 antes.

Em troca, a fase de configuração acha o arquivo pronto: cada Tool ganha um
`configure()` ao lado do seu `install`, sem tocar na arquitetura.

Risco aceito: com a receita distribuída em 22 arquivos, uma mudança transversal (um
campo novo no schema) toca 22 arquivos. Mitigado pelo schema zod único de
`defineTool`, que faz o compilador apontar todos eles de uma vez.

## Alternativas consideradas

**Catálogo declarativo com discriminated union.** Rejeitada pelo motivo acima: é a
melhor arquitetura para o problema de hoje e a errada para o problema de amanhã, que
já está datado na ADR-0001.

**Módulo "gordo"** — cada Tool escrevendo seu próprio `install()` de fato. Rejeitada:
produziria 22 cópias divergentes de `brew install --cask`, e a correção de um bug de
instalação teria que ser aplicada 22 vezes.
