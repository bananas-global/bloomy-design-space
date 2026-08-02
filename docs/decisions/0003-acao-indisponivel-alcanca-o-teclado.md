# 0003 — Ação indisponível usa `aria-disabled`, não `disabled`

**Data:** 2026-08-02
**Situação:** aceita

## Contexto

A convenção central deste Design Space é que **ação bloqueada não some**: ela
fica visível, inativa, e diz o motivo — o motivo é a informação, o botão é só
onde ela cabe. Está em `AGENTS.md` e na decisão `0002`.

A implementação usava o atributo nativo `disabled`. Um botão `disabled` **sai da
ordem de foco**. Quem navega por teclado passa direto por ele: nunca o encontra,
nunca é levado até ele, e por isso nunca ouve o `aria-describedby` que carrega o
motivo.

Ou seja: a convenção inteira valia só para quem enxerga a tela. Para quem navega
por teclado ou leitor de tela, o comportamento era indistinguível de esconder a
ação — exatamente o que ela existe para evitar.

## Medição

Além disso, `disabled:opacity-55` sobre os dois variantes principais:

| Variante | Cor efetiva | Contraste |
| --- | --- | --- |
| Primário (branco sobre `#276e8c` a 55%) | branco sobre `#a1afc0` | **2,35:1** |
| Secundário (`#2b235b` a 55% sobre branco) | `#8a86a5` sobre branco | **3,48:1** |

**Isto era conforme.** A WCAG 2.2 §1.4.3 isenta explicitamente componentes de
interface inativos, e é por isso que o axe não reprovava — ele pula controles
desabilitados na regra de contraste. Não havia violação a corrigir.

O que havia era um argumento: um botão que a pessoa não alcança não precisa ser
legível, e por isso a isenção existe. No momento em que ele volta para a ordem
de foco, a isenção deixa de valer — e deixa de valer o argumento junto com a
regra. Um controle que a pessoa alcança e não consegue ler não ajuda ninguém.

## Decisão

1. O bloqueio por regra de negócio usa **`aria-disabled="true"`**. O atributo
   `disabled` fica reservado para quando quem chama o componente o pede
   explicitamente.
2. O botão continua alcançável pelo Tab, é anunciado como indisponível, e o
   motivo é lido no foco.
3. O clique não tem efeito porque, bloqueado, o `onClick` de quem chamou **não
   chega a ser ligado**. Essa é a barreira real. O `stopPropagation` no
   manipulador cobre apenas handlers React de ancestrais — não ouvintes nativos,
   que o React registra na raiz e que por isso disparam antes.
4. O estado indisponível tem **cor própria**, e não opacidade:
   `rgba(43,35,91,0.72)` sobre `#f4f6f7` — **5,56:1**. O par está declarado em
   `src/tokens/contrast.ts`, então o teste de tokens o protege de uma clareada
   futura.

## Consequências

- Quatro jornadas em `tests/e2e/journey.spec.ts` fixam o comportamento: foco,
  `aria-disabled`, associação do motivo e as cores medidas.
- As 34 asserções `toBeDisabled()` existentes continuaram passando: o Playwright
  já considera `aria-disabled="true"` como desabilitado.
- Um botão indisponível agora aparece na lista de botões de um leitor de tela.
  É o objetivo, e é uma mudança real de superfície: telas com muitas ações
  bloqueadas ficam mais longas de percorrer por teclado. O ganho — saber que a
  ação existe e por que não está disponível — vale o custo, e é a mesma troca
  que a decisão `0002` já tinha feito para quem enxerga.

## Alternativa descartada

Manter `disabled` e mover o motivo para um `role="status"` lido na chegada à
tela. Descartado porque desassocia o motivo da ação: numa tela com seis ações
bloqueadas, seis frases anunciadas em sequência não dizem qual pertence a qual.
