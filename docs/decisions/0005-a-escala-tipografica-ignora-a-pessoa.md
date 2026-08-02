# 0005 — A escala tipográfica ignorava a preferência da pessoa

**Data:** 2026-08-02
**Situação:** aceita

## Contexto

Toda a tipografia do Design Space estava em pixel: 294 ocorrências de
`text-[13px]`, `text-[15px]`, `text-[14px]` e companhia, mais `font-size: 16px`
no `body`.

Há duas coisas diferentes que se chamam "zoom" no navegador:

| | O que escala | Pixel acompanha? |
| --- | --- | --- |
| Zoom de página (`Ctrl` `+`) | tudo, inclusive o layout | sim |
| Preferência de fonte padrão | só o texto | **não** |

A segunda é a acomodação mais comum de quem tem baixa visão e de muita gente
mais velha: aumentar a fonte padrão e manter o layout. Com a escala em pixel,
**essa preferência era ignorada em todo o produto**. Medido: com a raiz em 32 px,
um parágrafo de 13 px continuava em 13 px.

## Isto era conforme

A WCAG 1.4.4 (Resize Text, AA) é satisfeita pelo zoom de página nos navegadores
modernos, e é assim que a maioria dos produtos em pixel passa. Não havia
violação a corrigir — havia gente sendo ignorada.

É o mesmo formato da decisão `0003`: a regra permitia, o argumento não.

## Decisão

1. Toda a escala tipográfica passou para `rem`. `text-[15px]` virou
   `text-[0.9375rem]`, e assim por diante nas 294 ocorrências.
2. `body { font-size: 16px }` virou `1rem`.
3. **A saída no padrão é idêntica.** `0.9375rem × 16 = 15px` — a conversão não
   muda um pixel para quem não alterou nada. Foi conferido no navegador antes e
   depois: 15, 13 e 14 px nos mesmos elementos.
4. Com a raiz dobrada, o texto dobra (15→30, 13→26, 14→28) e o layout cresce
   junto — de 10.021 px para 20.020 px de altura — em vez de cortar.

## O teste, e o que ele ensinou

`tests/e2e/zoom.spec.ts` dobra a raiz nos 186 cenários e afirma duas coisas: o
texto escala, e nada transborda na horizontal.

A primeira versão media **um elemento por tela**. Ela passou — e passou também
quando reverti `Notifications.tsx` inteiro para pixel. Uma tela quase toda
quebrada passava, porque o único elemento amostrado por acaso escalava.

Passou a medir **todos** os elementos de texto. Repetida a mutação, reprovou
nomeando o elemento e os dois tamanhos.

É a terceira vez nesta noite que a mutação revela uma verificação cega — e as
três foram do mesmo tipo: **medir pouco aprova muito.** A ordem dos dois
`expect` no teste também é deliberada: sem escala não há como transbordar, então
a asserção de transbordo passaria de graça se viesse primeiro.

## Consequências

- Alguém que escreva `text-[14px]` numa tela nova reintroduz o problema em um
  ponto. O teste pega, porque mede todos os elementos.
- Fixtures com texto muito longo passam a ser mais valiosas: é com a fonte
  dobrada que elas quebram layout, e o teste roda os 186 cenários.
