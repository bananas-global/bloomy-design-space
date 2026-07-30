# AGENTS.md

Instruções para agentes de IA trabalhando no Bloomy Design Space. Leia antes de
alterar qualquer arquivo.

## O que este repositório é

Uma **especificação executável** da experiência pretendida do Bloomy, produto de
gestão de clínicas. Não é sistema de produção, não é design system, e não é
código a ser portado: o Bloomy real é um monólito Elixir/Phoenix, e a engenharia
traduz o comportamento descrito aqui.

A unidade central é o **cenário**, não a tela. Um cenário combina intenção,
persona, permissões, pré-condições, dados, ações, regras e resultado esperado.

## Comandos

```bash
pnpm dev          # dev server na porta 5206 (derivada do nome do projeto)
pnpm typecheck
pnpm test         # contrato de cenário, regras de negócio e contraste dos tokens
pnpm test:e2e     # 75 jornadas Playwright + axe nos 24 cenários
pnpm check        # typecheck + test + build — rode antes de concluir qualquer alteração
```

## Onde as coisas ficam

| Caminho | Conteúdo |
| --- | --- |
| `src/app/catalog.ts` | Módulos, jornadas, cenários, personas, fixtures e regras. **Livre de React.** |
| `src/app/product.ts` | O catálogo mais as rotas e o tema. É o que o motor recebe. |
| `src/scenarios/` | Cenários, um arquivo por módulo. |
| `src/rules/` | Regras de negócio **com** implementação testável. |
| `src/screens/` | Composições de tela. Recebem `params` e `context`. |
| `src/components/` | `AppShell` (drawer navy) e primitivos do Bloomy. |
| `src/fixtures/` | Dados sintéticos e determinísticos. |
| `src/contracts/` | Tipos do domínio e formatação. |
| `src/tokens/` | `tokens.css` e os pares de contraste declarados. |
| `docs/decisions/` | Decisões e consequências. Comece por 0001. |

**Por que `catalog.ts` é separado de `product.ts`:** o Playwright carrega os testes
com esbuild puro, sem os plugins do Vite, então um `import` de SVG ou CSS na
cadeia derruba a suíte antes do primeiro teste. O teste de jornada importa o
catálogo. Não junte os dois.

## Vocabulário

Use o vocabulário da clínica em tudo que aparece na interface e na navegação:
convênio recusado, guia, prontuário restrito, responsável legal, ausência,
encaixe. Nunca `ClaimDeniedState` nem "registro do paciente".

## Guardrails

- **Nunca** usar dado real de paciente. Fixture é sintética, sanitizada e
  determinística. Os CPFs têm dígito verificador inválido de propósito.
- **Nunca** `new Date()`, `Date.now()` ou `Math.random()` em fixture, regra ou
  tela. A data de referência é `TODAY` em `src/contracts/index.ts`; a agenda
  carrega um `now` declarado. Determinismo é critério de aceite.
- **Não** modificar `@brucesantos/design-space` para resolver necessidade do
  Bloomy. Se parecer necessário, pare e pergunte.
- **Não** promover componente do Bloomy para o motor. Reuso de UI é decisão local.
- **Não** remover foco visível, rótulo acessível, ordem de tabulação ou contraste
  para resolver um pedido de layout. Se um item do backlog exigir isso, **pare e
  pergunte** — não escolha o layout.
- **Não** esconder ação bloqueada. Use `unavailableReason` no `Button`: o controle
  fica visível, desabilitado, com o motivo associado por `aria-describedby`. Ver
  `docs/decisions/0002`.
- **Não** clarear token para "melhorar o visual" sem rodar `pnpm test`. Os pares
  de contraste falham o build, e é assim que deve ser.
- **Não** adicionar adapter de backend. O Bloomy não tem API pública, e o padrão é
  `dataSources: { default: "fixtures" }`.
- Registrar em `docs/decisions/` toda nova regra ou decisão que altere
  comportamento.

## Como criar um cenário

1. Id no formato `modulo.situacao`, kebab-case, prefixo casando com um módulo
   registrado (`agenda`, `patients`, `finance`).
2. `title` no vocabulário do negócio.
3. `persona` e `fixture` apontando para ids existentes. O motor valida em runtime
   e reclama no painel de Diagnóstico.
4. `a11y` completo. `keyboard: "full"` é uma afirmação: se a jornada não é
   completável só por teclado, não escreva `full`.
5. `expected` preenchido. Sem critério de aceite, o cenário não vira caso
   verificável no handoff.
6. `route` casando com uma rota de `product.ts`.
7. Se a situação exercita uma regra, cite o id em `rules`.
8. Se algo precisa ser anunciado para leitor de tela, liste em `a11y.announces` e
   implemente com `role="status"` ou `role="alert"`.

Depois, adicione o teste de jornada correspondente em `tests/e2e/journey.spec.ts`.
Cenário sem jornada é cenário que ninguém verifica.

## Como pedir mudanças (formato que funciona)

```
Abra o cenário "finance.insurance-denied" e reduza a ambiguidade da ação de
reenvio. Preserve todas as regras existentes.

Crie o cenário "agenda.walk-in" para a persona recepcionista, com fixture
sintética e URL direta.

Aplique este backlog do coletor. Cada item tem arquivo e linha.
Não mude token nem regra: se um item exigir isso, pare e pergunte.
```

## Coletor de feedback

`feedback-collector` está ativo em desenvolvimento. Segure `ALT` para destacar,
`ALT` + clique para capturar e escrever a instrução, "Copiar backlog" para gerar o
markdown com `arquivo:linha`.

O `arquivo:linha` vem do `@react-dev-inspector/babel-plugin` no `vite.config.ts`.
Em React 19 não existe fallback pelo fiber: **sem o plugin não há source
mapping**. Não remova.

O `feedback-collector` traz uma skill de setup para agentes de código, em
`skills/feedback-collector-setup/SKILL.md` do seu repositório. Ela cobre as
receitas por bundler, o caveat do React 19 e como remover a instalação — use-a em
vez de reconstruir a configuração do zero.

## Atalhos do ambiente

| Atalho | Efeito |
| --- | --- |
| `Shift` + `C` | Chrome do Design Space (revisão limpa) |
| `Shift` + `K` | Modo teclado, com ordem de tabulação |
| `Shift` + `P` | Painel de contexto |
