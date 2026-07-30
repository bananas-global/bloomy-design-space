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
`finance.insurance-denied` — Convênio recusado

## Referência aprovada
https://bloomy-design-space-<hash>-<escopo>.vercel.app/finance/claims/GUI-4042?scenario=finance.insurance-denied

Commit: <sha completo>
Status do cenário: aprovado

## Persona e permissões
Analista financeiro · `finance.read`, `claims.read`, `claims.retry`, `patients.read`

## Pré-condições
- Guia recusada pela SulAmérica com código TUSS-3001.
- Dois de quatro documentos exigidos ainda não anexados.

## Regras
- `retry-after-document-review` — guia recusada só pode ser reenviada depois que
  todos os documentos exigidos estiverem anexados.
  Implementação de referência: `src/rules/finance.ts` → `canResubmit`.
  Testes: `tests/rules.test.ts` → "retry-after-document-review" (4 casos).
- `denial-reason-always-visible` — motivo e código da recusa ficam visíveis na
  tela da guia, não em um histórico que precise ser aberto.

## Comportamento esperado
- O motivo e o código da recusa aparecem na tela, acima dos dados da guia.
- Reenviar aparece desabilitado, nomeando os documentos que faltam:
  "Falta anexar: Relatório clínico assinado, Laudo do exame anterior."
- Anexar os dois documentos libera o reenvio na mesma tela, sem recarregar.
- A ação de anexar respeita `claims.retry`.

## Estados alcançáveis
| Estado | Como abrir |
| --- | --- |
| Recusa com pendência | `?scenario=finance.insurance-denied` |
| Documentação completa | `?scenario=finance.resubmit-allowed` |
| Pendência, não recusa | `?scenario=finance.pending-documents` |
| Em análise | `?scenario=finance.invoice-under-review` |
| Sem permissão | `?scenario=finance.resubmit-no-permission` |
| Carregando | `?scenario=finance.insurance-denied&network=loading` |
| Erro | `?scenario=finance.insurance-denied&network=error` |

## Acessibilidade
- Jornada completável só por teclado.
- Contraste WCAG 2.2 AA nos tokens em uso (ver aviso sobre divergência de tokens).
- Anunciar: `claim.status` na chegada (região `role="alert"`), `retry.result`
  após o reenvio (região `role="status"`).

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
