# Pauta de design — contraste dos tokens do Bloomy

**Para:** time de design e produto do Bloomy
**Origem:** construção do Bloomy Design Space, 30/07/2026
**Pedido:** uma decisão sobre levar as correções para o produto, não aprovação de código
**Versão para apresentar:** https://claude.ai/code/artifact/8c5ae249-1097-43af-894e-c3fb849a9abe
— mesma pauta, com cada par mostrado em tamanho real. Privada até você compartilhar.

---

## O que aconteceu

Ao declarar os pares de cores do Bloomy para validação automática de contraste,
sete tokens reprovaram WCAG 2.2 AA nos usos que eles têm hoje no produto.

Não foi uma auditoria de acessibilidade. Foi consequência de o Design Space exigir
que cada par de cor seja declarado e medido — o problema apareceu sozinho.

## As medições

Razão de contraste WCAG, com o alfa composto sobre o fundo real. O mínimo para
texto normal é **4.5:1**; para texto grande, 3:1.

| Token | Onde é usado | Medido | Situação |
| --- | --- | --- | --- |
| `--brand-blue` `#58bada` como fundo de botão, texto branco | CTA primário | **2.22:1** | ✖ menos da metade do mínimo |
| `--brand-blue` como texto | ícones, destaques | **2.22:1** | ✖ |
| `--brand-blue-dark` `#4094bb` | cor de link, títulos `h1` | **3.40:1** | ✖ |
| `--fg-3` alfa 0.45 | placeholder de campo | **2.65:1** | ✖ |
| `--color-green` `#3db03a` | indicador positivo | **2.81:1** | ✖ |
| `--color-warning` `#ffc402` | aviso | **2.27:1** | ✖ |
| `--fg-2` alfa 0.6 | texto secundário, breadcrumb | **4.01:1** | ✖ passa raspando em texto grande |

O caso mais consequente é o primeiro. `#58bada` é a cor da marca — está no
símbolo, no drawer, é a identidade visual do Bloomy. E é usada como preenchimento
do botão principal com texto branco.

## Por que isso importa na prática

Três efeitos concretos, na ordem em que aparecem:

1. **Legibilidade em condição real.** 2.22:1 é ilegível sob luz de janela, em tela
   de notebook com brilho baixo, ou para quem tem visão reduzida. A recepção de
   clínica trabalha nas três condições.
2. **Conformidade contratual.** Se o Bloomy atender cliente de governo, o
   instrumento aplicável é o eMAG, obrigatório para sítios e portais pela Portaria
   nº 3 de 2007. Ele é construído sobre WCAG 2.0, então esses tokens reprovam lá
   também.
3. **Custo crescente.** Corrigir na definição do token é uma mudança. Corrigir
   depois, tela por tela, são trinta.

## A proposta

Não mexer na identidade. Separar **cor de marca** de **cor de ação** — que é a
correção estrutural, e resolve o problema principal sem tocar no símbolo nem no
drawer.

| Papel | Hoje | Proposta | Medido |
| --- | --- | --- | --- |
| Cor de marca | `#58bada` | **sem mudança** | — |
| Cor de ação e link | `#4094bb` | `#276e8c` | 5.68:1 |
| Ação em hover | — | `#1f5a73` | 7.28:1 |
| Texto secundário | alfa 0.6 | alfa **0.72** | 5.79:1 |
| Placeholder | alfa 0.45 | alfa **0.66** | 4.80:1 |
| Chip de aviso | `#dba301` sobre branco | `#854d0e` sobre `#fff8e1` | 6.45:1 |
| Chip pendente | `#cd7445` sobre `#fdeee1` | `#a8542a` sobre `#fdeee1` | 4.66:1 |

O ciano de assinatura **permanece** e continua sendo a cor do Bloomy. Ele só deixa
de carregar texto: sobre o navy do drawer ele entrega 6.33:1 e funciona bem, que é
onde ele já está.

Verde e vermelho dos chips já passam na forma `-dark` sobre `-light` — nada a fazer
neles.

## O que já está feito

O Bloomy Design Space roda com a paleta corrigida, com os 24 cenários passando no
axe sem violação séria. Dá para abrir por link e comparar lado a lado com o produto
atual antes de decidir qualquer coisa.

A validação também está automatizada: `tests/tokens.test.ts` quebra o build se
algum par cair abaixo do alvo, e há um bloco que **afirma que os tokens do produto
ainda falham** — se a origem for corrigida, o teste avisa que este documento ficou
obsoleto.

## A decisão que precisamos

1. As correções entram no produto real? (Se sim, alguém precisa levantar todos os
   usos de `--brand-blue` como CTA e de `--brand-blue-dark` como link.)
2. Ou o Design Space fica divergente, e a divergência é comunicada em todo handoff?
   (É o estado atual, e funciona — mas significa que o produto segue não conforme.)
3. Alvo de conformidade: confirmar se algum contrato ativo exige eMAG
   nominalmente, ABNT NBR 17060, ou nível AAA.

---

**Anexo.** Medidas completas, valores novos e raciocínio de cada escolha em
[`docs/decisions/0001-tokens-corrigidos-para-contraste.md`](decisions/0001-tokens-corrigidos-para-contraste.md).
