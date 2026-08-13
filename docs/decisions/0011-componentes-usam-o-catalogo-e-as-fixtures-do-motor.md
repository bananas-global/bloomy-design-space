# 0011 — Componentes usam o catálogo e as fixtures do motor

## Contexto

O porte dos 47 componentes de `core_components.ex` começou numa página local em
`/componentes`. Depois que o motor passou a oferecer um catálogo próprio, manter
a página e a aba produzia duas interfaces para a mesma referência. O motor 0.4
também passou a resolver fixtures exclusivas de cada componente.

## Decisão

`GALLERY` continua sendo a fonte local dos componentes e das demonstrações, mas
é exposta somente por `ProductDefinition.components`. Cada demonstração vira
uma fixture do componente: título como rótulo, nota como descrição e um id
kebab-case determinístico no deep link.

A rota e a tela agregada `/componentes` são removidas. Cenários continuam usando
as fixtures do produto; componentes recebem apenas suas próprias fixtures. O
estado interativo temporário de uma demonstração permanece dentro do preview.

## Consequências

- busca, seleção, contexto e links de componentes pertencem a uma única UI;
- um link identifica componente e estado, por exemplo
  `?component=core.button&fixture=os-tres-tamanhos`;
- alterar o título de uma demonstração altera seu id público e exige revisão dos
  links e testes correspondentes;
- o catálogo não cria dependência entre fixtures de cenário e de componente.
