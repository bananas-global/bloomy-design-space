# AGENTS.md

Instruções para agentes de IA trabalhando no Bloomy Design Space. Leia antes de
alterar qualquer arquivo.

## O que este repositório é

Uma **especificação executável** da experiência pretendida do Bloomy. Não é
sistema de produção, não é design system, e não é código a ser portado: o Bloomy
real é um monólito Elixir/Phoenix, e a engenharia traduz o comportamento
descrito aqui.

**O Bloomy é um sistema de terapia ABA para autismo**, não uma clínica médica
genérica. Programas com fases de aquisição, protocolos como o ABLLS-R,
tentativas com ajuda verbal ou motora, aplicadores sob supervisão formal, planos
de intervenção comportamental. Se um cenário novo puder ser escrito sem esse
vocabulário, provavelmente está descrevendo outro produto.

A unidade central é o **cenário**, não a tela. Um cenário combina intenção,
persona, permissões, pré-condições, dados, ações, regras e resultado esperado.

O conteúdo aqui foi portado do monólito em 2026-08-01/02. O log do porte, com o
que foi traduzido de onde e treze achados sobre o sistema real, está em
[`docs/porte-do-sistema-real.md`](docs/porte-do-sistema-real.md).

Os 285 cenários desse baseline usam `status: "ported"`: são referência importada,
não validada e sem compromisso de implementação. Não os promova em massa. Quando
um tema entrar no trabalho real, crie ou revise apenas o cenário que delimita a
mudança e só então use `proposed`, seguindo o ciclo normal até aprovação e
implementação. Em Listas gerenciais, por exemplo, as onze listas são `ported` e
somente a reorganização da navegação é `approved`.

## Comandos

```bash
pnpm dev          # dev server na porta 5206 (derivada do nome do projeto)
pnpm typecheck
pnpm test         # contrato de cenário, regras de negócio e contraste dos tokens
pnpm test:e2e     # 356 jornadas Playwright + axe em todos os cenários
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
| `src/components/` | `AppShell` e primitivos do Bloomy. |
| `src/personas/permissions.ts` | **Gerado.** Matriz de 104 permissões por papel. Não editar à mão. |
| `scripts/gen-permissions.mjs` | Fonte da matriz, traduzida das 26 policies do monólito. |
| `src/fixtures/` | Dados sintéticos e determinísticos. |
| `src/contracts/` | Tipos do domínio e formatação. |
| `src/tokens/` | `tokens.css` e os pares de contraste declarados. |
| `docs/decisions/` | Decisões **deste produto**. As do modelo vivem no repositório do motor. |

**Superfícies.** O Bloomy não é uma aplicação só. O backoffice tem menu lateral;
os três portais externos — totem, família e operadora — são páginas próprias,
abertas por link ou QR Code. Tela de portal passa `surface="standalone"` ao
`AppShell`. Errar isso é silencioso e embaraçoso: uma família no totem vendo
"Agenda · Pacientes · Autorizações" no canto da tela. Há teste que fixa isso.

**Por que `catalog.ts` é separado de `product.ts`:** o Playwright carrega os testes
com esbuild puro, sem os plugins do Vite, então um `import` de SVG ou CSS na
cadeia derruba a suíte antes do primeiro teste. O teste de jornada importa o
catálogo. Não junte os dois.

## Vocabulário

Use o vocabulário do produto em tudo que aparece na interface e na navegação. A
fonte é `priv/gettext/pt_BR/LC_MESSAGES/enums.po` do monólito, e ela vale mesmo
quando soa estranha fora de contexto: "Assinar" é o que a agenda mostra, e
trocar por "Assinatura pendente" faria a especificação divergir da palavra que a
clínica usa em voz alta.

Termos que carregam significado técnico: programa estruturado e incidental,
fase (linha de base, intervenção, generalização, manutenção, adquirido),
critério de domínio consecutivo ou cumulativo, tentativa com ajuda,
autorização parcial, guia, fechamento, mapa de horas, encaixe, responsável
legal. Nunca `ClaimDeniedState` nem "registro do paciente".

**Papéis:** são dez, e têm nome próprio no produto — Admin, Admin de Clínica,
Recepção, Operação, People, Coordenador, Supervisor, Especialista, Terapeuta,
Aplicador. Não invente arquétipos ("gestora", "analista financeira"): a
especificação já teve isso e descrevia um produto que não existe.

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
  fica visível, desabilitado, com o motivo associado por `aria-describedby`. É
  convenção do modelo — decisão 0006 no repositório do motor.
- **Não** clarear token para "melhorar o visual" sem rodar `pnpm test`. Os pares
  de contraste falham o build, e é assim que deve ser.
- **Não** adicionar adapter de backend. O Bloomy não tem API pública, e o padrão é
  `dataSources: { default: "fixtures" }`.
- **Não** editar `src/personas/permissions.ts` à mão. É gerado a partir das
  policies do monólito. Para mudar, mude `scripts/gen-permissions.mjs` e rode
  `node scripts/gen-permissions.mjs src/personas/permissions.ts`.
- **Não** perguntar pelo papel numa tela. Papéis são acumuláveis no monólito
  (`roles` é bitwise), então a pergunta certa é sempre por permissão. A única
  exceção é `visibleTabs/1` em `src/rules/inClinic.ts`, que reproduz uma decisão
  por papel do próprio produto e está isolada com nota.
- **Não** resolver uma divergência do monólito escolhendo o lado que parece
  certo. Reproduza o comportamento real, escreva um teste que o fixe, e registre
  o achado no log do porte. Há treze achados lá, incluindo duas contradições
  internas do produto.
- Registrar em `docs/decisions/` toda nova regra ou decisão que altere
  comportamento.

## Como criar um cenário

1. Id no formato `modulo.situacao`, kebab-case, prefixo casando com um módulo
   registrado. São catorze: `agenda`, `session`, `programs`, `protocols`,
   `in-clinic`, `patients`, `authorizations`, `closures`, `invoices`, `team`,
   `structure`, `public`, `guardian`, `insurer`.
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

9. Se a tela for de portal externo, passe `surface="standalone"` ao `AppShell`.

Depois, adicione o teste de jornada correspondente em `tests/e2e/journey.spec.ts`.
Cenário sem jornada é cenário que ninguém verifica.

## Como escrever uma regra

Regra sem implementação testável é frase que a engenharia reinterpreta. Cada uma
tem `statement`, `rationale`, uma função em `src/rules/` e testes em
`tests/rules.test.ts`.

Duas coisas que o porte mostrou valerem a pena:

- **O `rationale` explica a consequência, não repete o enunciado.** "Reenvio sem
  documento é recusado de novo e o prazo do convênio corre" decide um desenho;
  "é importante ter documentação completa" não decide nada.
- **A ordem das verificações é parte da regra.** No início do atendimento, o
  bloqueio por atendimento em aberto vem antes do bloqueio por check-in —
  invertido, a tela manda à recepção quem só esqueceu de fechar a sessão
  anterior. Quando a ordem importa, ela tem teste próprio.

## Elos entre módulos

Três decisões que parecem de uma tela e moram em outra. Quem for mexer nelas
precisa saber onde estão:

| O que parece ser de… | mora em… | e é lido por… |
| --- | --- | --- |
| Atendimento (segunda assinatura) | vínculo de estágio, em `src/rules/team.ts` | `session.needsSupervisorSignature` |
| Fechamento (etapas de nota fiscal) | contrato do profissional, em `src/rules/team.ts` | `closure.issuesInvoice` |
| Atendimento (dispensa de check-in) | cadastro do serviço, em `src/rules/structure.ts` | `service.chargeable` |

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
