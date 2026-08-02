# 0004 — O anel de foco nascia invisível

**Data:** 2026-08-02
**Situação:** aceita

## Contexto

`src/tokens/tokens.css` declara o anel de foco e traz um comentário dizendo que
removê-lo é violação de guardrail. O anel estava lá, o comentário estava lá, e
o anel **não aparecia**.

Dois defeitos independentes, os dois só visíveis medindo no navegador.

## Defeito 1 — especificidade zero

```css
:where(a, button, input, …):focus-visible {
  outline: 2px solid var(--color-accent);
}
```

`:where()` tem especificidade zero por definição. `outline-style` e
`outline-width` chegavam ao navegador; `outline-color` era perdida e caía no
valor inicial da propriedade, que é **`currentColor`**.

Num botão primário — texto branco sobre `#276e8c` — `currentColor` é branco. Com
`outline-offset: 2px`, o anel é desenhado 2px **fora** da borda, ou seja, sobre
o cartão. O cartão é branco.

Resultado: anel branco sobre fundo branco em toda ação primária do produto.

Medido: `outline-color` computado `rgb(255, 255, 255)` com `--color-accent`
resolvendo corretamente para `#6144c5` numa sonda ao lado. É o que separa
"a regra existe" de "a regra funciona".

## Defeito 2 — a transição começa em branco

Corrigida a especificidade, o Playwright continuou lendo branco enquanto o
navegador de desenvolvimento mostrava roxo. A diferença era **latência humana**:

```
transition-property: color, background-color, border-color,
                     outline-color, text-decoration-color, fill, stroke, …
```

O utilitário `transition-colors` do Tailwind v4 **inclui `outline-color`**. O
anel partia do valor anterior — `currentColor`, branco — e só chegava ao roxo no
fim da transição. Medido: `rgb(255,255,255)` imediatamente após o foco,
`rgb(97,68,197)` 600 ms depois.

Quem navega devagar via o anel. Quem tabula rápido nunca via — e é exatamente
quem mais depende dele.

## Decisão

1. A regra de foco usa **lista de seletores explícita**, sem `:where()`, e
   declara `outline-color` à parte da abreviação. O mesmo para o bloco do
   drawer, que troca a cor do anel sobre o navy.
2. A regra de foco **redeclara `transition-property`** com a lista do utilitário
   menos `outline-color`. O resto continua transicionando; o anel aparece
   inteiro no primeiro quadro.
3. Os dois pares do anel entraram em `src/tokens/contrast.ts` —
   `#6144c5` sobre `#ffffff` (6,69:1) e sobre `#f0f6f8` (6,12:1). A WCAG 1.4.11
   pediria 3:1 por ser elemento não textual; passam com folga no alvo de texto,
   então ficam na lista normal e o teste de tokens os protege.

## Consequências

- Duas jornadas em `tests/e2e/journey.spec.ts` medem o anel **sem espera
  nenhuma**, o que é a asserção que importa: a leitura imediata é a que
  reprovava antes.
- A jornada do drawer fixa a troca de cor sobre o navy, que tinha o mesmo
  defeito de especificidade e falhava do mesmo jeito.

## O que isto ensina sobre o repositório

Nenhum teste pegava isso. O axe não pega: ele não avalia contraste de anel de
foco. Os 186 cenários passavam. O comentário no CSS afirmava que o foco era
responsabilidade do produto — e era, e estava quebrado desde sempre.

A lição não é "faltou um teste": é que **estilo declarado não é estilo
aplicado**, e a única forma de saber a diferença é medir o valor computado num
navegador de verdade. As duas jornadas novas fazem exatamente isso.
