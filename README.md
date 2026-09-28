# Bloomy Design Space

Componentes e layouts do Bloomy em React, espelhados do monólito
Elixir/Phoenix. É a fonte do design system do Bloomy no Claude Design, e o lugar
onde uma tela desenhada lá vira um PR com preview para os devs.

```bash
pnpm install
pnpm dev   # http://localhost:5206
```

- **Componentes**: `src/components/`, um espelho por componente Phoenix, com os
  mesmos atributos e classes.
- **Layouts**: `src/layouts/`, as molduras de página do sistema.
- **Telas de feature**: só dentro de um PR, enquanto a feature está em desenho.

Como trabalhar, do Claude Design ao PR: [`AGENTS.md`](AGENTS.md).

O conteúdo anterior (304 cenários portados do sistema, regras e o log do porte)
está na tag `porte-2026-08`.
