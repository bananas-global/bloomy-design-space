# 0001 — Tokens corrigidos para contraste, divergindo do produto em produção

**Data:** 2026-07-30
**Status:** aceita
**Impacto:** precisa de decisão do time sobre levar as correções para o produto real

## Contexto

Os tokens deste Design Space foram derivados de `bloomy/assets/css/app.css` e do
design system em `prototipo-sistema-bloomy`. Ao declarar os pares de cores para a
validação de contraste, vários tokens do produto reprovaram WCAG 2.2 AA nos usos
em que aparecem hoje.

Medições, com o alfa composto sobre o fundo real:

| Token | Uso no produto | Medido | Mínimo AA |
| --- | --- | --- | --- |
| `--brand-blue` `#58bada` como texto sobre branco | CTA primário, ícones | **2.22:1** | 4.5:1 |
| branco sobre `--brand-blue` | preenchimento de botão primário | **2.22:1** | 4.5:1 |
| `--brand-blue-dark` `#4094bb` sobre branco | cor de link, títulos `h1` | **3.40:1** | 4.5:1 |
| `--fg-2` `rgba(43,35,91,0.6)` sobre branco | texto secundário, breadcrumb | **4.01:1** | 4.5:1 |
| `--fg-3` `rgba(43,35,91,0.45)` sobre branco | placeholder de campo | **2.65:1** | 4.5:1 |
| `--color-green` `#3db03a` sobre branco | indicador positivo | **2.81:1** | 4.5:1 |
| `--color-orange-dark` sobre `--color-orange-light` | chip pendente | **2.99:1** | 4.5:1 |
| `--color-warning` `#ffc402` sobre branco | aviso | **2.27:1** | 4.5:1 |

O caso do azul de assinatura é o mais consequente. `#58bada` é a cor da marca:
ela está no símbolo, no drawer e é a identidade visual do Bloomy. E ela é usada
como preenchimento de botão primário com texto branco, onde entrega 2.22:1 —
menos da metade do mínimo. Não é um detalhe de token: é o botão principal do
produto.

## Decisão

Este Design Space usa uma versão corrigida da paleta. A identidade é preservada;
apenas os valores usados **como texto ou como preenchimento com texto** foram
escurecidos até passar AA.

| Papel | Produto | Design Space | Medido |
| --- | --- | --- | --- |
| Texto principal | `#2b235b` | `#2b235b` (sem mudança) | 14.05:1 |
| Texto secundário | alfa 0.6 | alfa **0.72** | 5.79:1 |
| Placeholder | alfa 0.45 | alfa **0.66** | 4.80:1 |
| Ação e link | `#4094bb` | `#276e8c` | 5.68:1 |
| Ação em hover | — | `#1f5a73` | 7.28:1 |
| Chip confirmado | `#256a23` / `#e2f3e1` | sem mudança | 5.73:1 |
| Chip recusado | `#902a2a` / `#fde3e3` | sem mudança | 6.77:1 |
| Chip em análise | `#dba301` / branco | `#854d0e` / `#fff8e1` | 6.45:1 |
| Chip pendente | `#cd7445` / `#fdeee1` | `#a8542a` / `#fdeee1` | 4.66:1 |
| Etiqueta neutra (`tag/1` variante `brand`) | alfa 0.20 / texto alfa 0.80 | alfa **0.08** / texto **cheio** | 12.07:1 |

A etiqueta neutra entrou nesta tabela depois das outras, e por um motivo que não é
contraste. `tag/1` monta a variante `brand` por opacidade — `bg-brand-purple-dark/20
text-brand-purple-dark/80`, a única do conjunto que não usa dois tokens —, e o
`tint`/`brand` do `Button` usa 8% no fundo com o texto cheio. Os dois aparecem lado
a lado no mesmo cartão: o selo "Padrão" ao lado do botão "Editar". Dois cinzas do
mesmo token em opacidades diferentes leem como dois tons por engano, não como
hierarquia, e a etiqueta foi alinhada ao botão. O ganho de contraste — de 5.08:1
para 12.07:1 — veio junto, e é o que faz a mudança caber aqui.

O ciano de assinatura `#58bada` **permanece** — em superfície escura, onde
funciona: sobre o navy do drawer ele entrega 6.33:1. O que mudou é que ele deixou
de ser cor de ação. Existe agora um token `--color-action` separado, e a distinção
entre "cor da marca" e "cor de ação" é a correção estrutural desta decisão.

## Consequências

- O Design Space não é pixel-idêntico ao Bloomy atual. Quem comparar lado a lado
  vai notar links e botões mais escuros. **Isso é intencional e precisa ser dito
  no handoff**, senão parece erro de implementação.
- Esta decisão gera trabalho fora deste repositório: alguém precisa decidir se as
  correções entram no produto real. O Design Space é onde a decisão de design
  acontece primeiro, mas não é onde ela é aplicada.
- `tests/tokens.test.ts` tem um bloco que afirma que os tokens do produto **ainda
  falham**. Se o Bloomy corrigir a origem, o teste quebra e avisa que este
  documento ficou obsoleto. Um registro de divergência que ninguém revalida vira
  folclore.
- O teste também reprova par com margem menor que 0.1 acima do mínimo: 4.5 exato é
  conformidade frágil, que morre no próximo ajuste de "clareia um pouquinho".

## Alternativa descartada

Reproduzir a paleta do produto fielmente e registrar as falhas como pendência.
Descartada por dois motivos.

Primeiro, o campo `a11y` do contrato de cenário exige declarar contraste AA. Um
cenário que declara AA sobre tokens que entregam 2.22:1 é uma declaração falsa, e
uma declaração falsa no contrato é pior que nenhuma.

Segundo, o axe no CI reprovaria os 24 cenários por color-contrast. Com o build
sempre vermelho, o sinal desaparece: em uma semana ninguém olha mais, e o próximo
problema real de acessibilidade entra sem ser notado.

## Nível alvo

WCAG 2.2 AA. Se o Bloomy atender cliente de governo, o instrumento aplicável é o
eMAG, construído sobre WCAG 2.0 — 2.2 AA é mais recente e mais estrito, então
cobre os dois casos. Confirmar por contrato se algum cliente exige eMAG
nominalmente, ABNT NBR 17060 ou nível AAA.
