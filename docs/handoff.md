# Handoff

Modelo de entrega para a engenharia do Bloomy. Copie a seção "Modelo" para o
ticket.

## O que este handoff é

Uma **especificação executável**, não código de produção. O Bloomy é um monólito
Elixir/Phoenix: a engenharia traduz o comportamento descrito aqui. O código React
serve como referência precisa de estado, conteúdo e interação — não como fonte a
ser portada linha por linha.

Declarar isso no próprio handoff evita o risco mais caro do processo: alguém
assumir que deve reescrever os componentes React em Phoenix.

## Aviso que precisa ir em todo handoff deste projeto

> Os tokens de cor deste Design Space divergem do produto em produção: vários
> tokens atuais não atingem WCAG 2.2 AA quando usados como texto ou como
> preenchimento de botão. As correções estão em
> `docs/decisions/0001-tokens-corrigidos-para-contraste.md`, com as medidas de
> cada par. **Links e botões vão parecer mais escuros que no Bloomy atual — isso é
> intencional, não erro de implementação.**

## O que precisa ir junto

1. **URL de commit** do cenário, não a de branch. A URL de branch muda de conteúdo
   a cada push, então uma aprovação registrada nela não é uma aprovação.
2. **Id do cenário**, para que a conversa aponte para a mesma situação.
3. **Regras** que governam a situação, com id. A implementação de referência está
   em `src/rules/` e o teste em `tests/rules.test.ts` — cada teste é um critério
   de aceite executável.
4. **Critérios de aceite**, que vêm de `expected` no cenário.
5. **Estados alcançáveis** e como abrir cada um por URL.
6. **Contrato de acessibilidade**: cobertura de teclado, nível de contraste e os
   eventos que precisam ser anunciados.

## Modelo

```markdown
## Cenário
`session.pending-supervisor` — Aguardando o supervisor

## Referência aprovada
https://bloomy-design-space-<hash>-<escopo>.vercel.app/sessions/atd-8801?scenario=session.pending-supervisor

Commit: <sha completo>
Status do cenário: em revisão

## Persona e permissões
Supervisor · papel por unidade, `custom_services.edit`, `professionals.list`

## Pré-condições
- A Marina assinou às 15:12.
- O atendimento exige segunda assinatura, da Clara.
- A exigência **não** mora no atendimento: vem do vínculo de estágio entre as
  duas, em `src/rules/team.ts`.

## Regras
- `owner-signs-before-supervisor` — a assinatura do supervisor só entra depois da
  assinatura de quem atendeu; a ordem não é negociável.
  Implementação de referência: `src/rules/session.ts` → `canSign`.
  Testes: `tests/rules.test.ts` → "owner-signs-before-supervisor".
- `supervision-link-defines-second-signature` — quem precisa de segunda
  assinatura é decidido pelo vínculo de supervisão, não pelo tipo do serviço.
  Implementação de referência: `src/rules/team.ts` → `requiresSupervisorSignature`.

## Comportamento esperado
- A assinatura já feita aparece com autoria e horário.
- Assinar como a responsável fica **visível e desabilitado**: a etapa dela já
  passou, e o motivo é dito por extenso.
- A assinatura do supervisor encerra o atendimento em Finalizado.

## Estados alcançáveis
| Estado | Como abrir |
| --- | --- |
| Aguardando o supervisor | `?scenario=session.pending-supervisor` |
| Aguardando quem atendeu | `?scenario=session.pending-signature` |
| Registro ainda não feito | `?scenario=session.pending-register` |
| Finalizado | `?scenario=session.finished` |
| Sem permissão de registrar | `?scenario=session.applicator-cannot-register` |
| Carregando | `?scenario=session.pending-supervisor&network=loading` |
| Erro | `?scenario=session.pending-supervisor&network=error` |

## Acessibilidade
- Jornada completável só por teclado.
- Contraste WCAG 2.2 AA nos tokens em uso (ver aviso sobre divergência de tokens).
- Anunciar: `session.signed` após a assinatura (região `role="status"`).

## Observação
Especificação executável. Stack real: Elixir/Phoenix. Traduzir comportamento e
regras, não portar componentes React.
```

## Depois do release

QA e design comparam o implementado com o cenário aprovado. Diferença intencional
atualiza o Design Space **ou** é registrada como decisão em `docs/decisions/`.
Quando o comportamento chega em produção, o `status` do cenário vira
`implemented` — e a partir daí o sistema real é a fonte de verdade do
comportamento entregue, não este repositório.

É esse passo que evita que a referência envelheça em silêncio.
