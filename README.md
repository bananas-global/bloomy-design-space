# Bloomy Design Space

Especificação executável da experiência pretendida do Bloomy. Agenda, pacientes e
financeiro em situações nomeadas pelo domínio, abertas por link, com dados
sintéticos e regras de negócio visíveis.

Não é um sistema de produção, não é um design system e não é promessa de reuso de
código. O Bloomy real é um monólito Elixir/Phoenix: a engenharia traduz o
comportamento descrito aqui, não porta os componentes React.

## Começar

```bash
pnpm install
pnpm dev
```

Abre em `http://localhost:5206` — porta derivada do nome do projeto, então é
sempre a mesma e não colide com outros Design Spaces abertos ao mesmo tempo.

A raiz mostra o produto como mapa de situações. Cada situação abre por URL
própria.

## O que existe hoje

24 cenários em três módulos, cobrindo sucesso, vazio, permissão, regra e exceção.

| Módulo | Situações |
| --- | --- |
| **Agenda** | dia normal, vazia, conflito de horário, reagendamento com conflito, consulta cancelada, cancelamento exige justificativa, sem permissão para cancelar, ausência antes da tolerância, paciente ausente |
| **Pacientes** | lista, vazia, cadastro completo, cadastro incompleto, menor sem responsável, menor com responsável, prontuário restrito (recepção), prontuário restrito (profissional) |
| **Financeiro** | fila de guias, vazia, fatura em análise, convênio recusado, documentos pendentes, reenvio permitido, sem permissão para reenviar |

Nenhum está com status `aprovado` ainda. A aprovação depende de revisar com uma
pessoa de negócio pelo link público — e marcar antes disso seria tratar
comentário como decisão.

## Regras implementadas

Toda regra tem implementação em `src/rules/` e teste em `tests/rules.test.ts`.
Regra sem teste é frase que a engenharia reinterpreta.

| Id | Regra |
| --- | --- |
| `cancel-requires-reason` | Cancelamento exige justificativa registrada. |
| `cancel-requires-permission` | Só perfis com `agenda.cancel` cancelam. |
| `no-double-booking` | Mesmo profissional não pode ter atendimentos sobrepostos. |
| `no-show-after-tolerance` | Ausência só 15 minutos depois do horário. |
| `minor-requires-guardian` | Menor de 18 exige responsável legal completo. |
| `incomplete-registration-blocks-scheduling` | Campo obrigatório em falta bloqueia agendar. |
| `restricted-record-requires-permission` | Prontuário restrito exige permissão específica. |
| `retry-after-document-review` | Reenvio de guia exige documentação completa. |
| `resubmit-requires-permission` | Só perfis com `claims.retry` reenviam. |
| `denial-reason-always-visible` | Motivo e código da recusa ficam na tela. |

## Tokens: divergência deliberada com o produto real

Os tokens vêm de `bloomy/assets/css/app.css`, com correções. Vários tokens do
produto em produção não atingem WCAG 2.2 AA quando usados como texto ou como
preenchimento de botão:

| Token do produto | Medido | Usado para |
| --- | --- | --- |
| `--brand-blue` `#58bada` | 2.22:1 | CTA primário e ícones |
| `--brand-blue-dark` `#4094bb` | 3.40:1 | cor de link e títulos h1 |
| `--fg-2` alfa 0.6 | 4.01:1 | texto secundário e breadcrumb |
| `--fg-3` alfa 0.45 | 2.65:1 | placeholder de campo |
| verde `#3db03a` | 2.81:1 | indicador positivo |

O Design Space usa a versão corrigida, porque descreve a experiência
**pretendida**. O raciocínio, os valores novos e a medida de cada um estão em
[`docs/decisions/0001-tokens-corrigidos-para-contraste.md`](docs/decisions/0001-tokens-corrigidos-para-contraste.md).

`tests/tokens.test.ts` valida os pares corrigidos **e** afirma que os do produto
ainda falham — se o Bloomy corrigir a origem, o teste quebra e avisa que o
registro ficou obsoleto.

Para levar ao time: [`docs/pauta-contraste.md`](docs/pauta-contraste.md), com uma
[versão visual para apresentar](https://claude.ai/code/artifact/8c5ae249-1097-43af-894e-c3fb849a9abe).

## Qualidade

```bash
pnpm check
```

```bash
pnpm test:e2e
```

O que quebra o build de propósito:

- **Typecheck.** Contrato de componente e de cenário.
- **Contrato de cenário.** Fixture, persona, regra ou rota inexistente, e
  qualquer aviso acumulado.
- **Contraste dos tokens.** Par abaixo do alvo, ou com margem menor que 0.1 —
  aprovado por 4.5 exato não sobrevive ao próximo ajuste.
- **Axe, violação séria ou crítica.** Por cenário, nos 24, na mesma jornada
  Playwright.
- **Regras de negócio.** 30 testes cobrindo fronteiras: a tolerância exata dos 15
  minutos, sobreposição que só encosta na borda, menor que fez 18 anos.

Estado atual: 45 testes unitários, 75 jornadas Playwright.

Verificação automática é piso, não teto. Ordem de leitura confusa, rótulo
tecnicamente presente mas sem sentido e fluxo impossível de completar com leitor
de tela passam no axe — revisão humana nas jornadas críticas continua necessária.

## Determinismo

A mesma URL produz sempre a mesma situação. Duas consequências práticas no
código:

- Nenhuma fixture chama `new Date()` ou `Math.random()`. A data de referência é
  `TODAY` em `src/contracts/index.ts`, e a agenda carrega um `now` declarado para
  que a tolerância de ausência seja verificável.
- Idade é medida contra `TODAY`, não contra o relógio. Sem isso, o cenário "menor
  sem responsável" deixaria de existir no aniversário de 18 anos da fixture,
  meses depois de alguém tê-lo aprovado.

## O motor

Este projeto consome `@brucesantos/design-space`, hoje por link local:

```json
"@brucesantos/design-space": "link:../design-space/packages/core"
```

Quando o pacote for publicado no npm, troque por `"^0.1.0"`. O motor não contém
nenhuma UI, token ou regra do Bloomy — a fronteira está descrita no
[`AGENTS.md`](AGENTS.md).

## Preview

Todo push gera preview automático na Vercel, **público e sem login**: o ambiente
roda só com fixture sintética, então não há dado de paciente a proteger, e
qualquer barreira cobraria atrito de quem mais precisa revisar sem esforço.

⚠️ **Antes do primeiro preview**, confirme o contrato do Bloomy. Saúde costuma ter
cláusula de confidencialidade cobrindo materiais e telas do projeto, não apenas
dados pessoais. Se houver, ligue Vercel Authentication neste projeto — é um
toggle, e o resto do desenho segue igual.

- **URL de branch** — revisão em andamento.
- **URL de commit** — aprovação e handoff. Imutável.

## Ver também

- [`AGENTS.md`](AGENTS.md) — instruções e guardrails para agentes de IA.
- [`docs/product.md`](docs/product.md) — visão, vocabulário, personas e cobertura.
- [`docs/handoff.md`](docs/handoff.md) — modelo de entrega para engenharia.
- [`docs/decisions/`](docs/decisions/) — decisões e consequências.
