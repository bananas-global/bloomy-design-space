LinkButton from bloomy-design-space. Use via `window.Bloomy.LinkButton` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `link_button/1`.
`<.link navigate>` vira `<a href>`. Como no original, `color="purple"` pinta
`bg-brand-accent text-white` em qualquer variante.

## Props

```ts
interface LinkButtonProps {
  variant?: "default" | "tint" | "outline" | "ghost";
  color?: "purple" | "red" | "blue";
  className?: string;
  navigate?: string;
  rightIcon?: string;
  leftIcon?: string;
  children: React.ReactNode;
  id?: string;
  style?: CSSProperties;
}
```

## Examples

### VariantesECores

```jsx
() => (
  <div className="space-y-3">
    {VARIANTES.map((variant) => (
      <div key={variant} className="flex flex-wrap items-center gap-2">
        <span className="w-16 shrink-0 text-xs font-bold text-neutral-500">{variant}</span>
        {CORES.map((color) => (
          <LinkButton key={color} navigate="#" variant={variant} color={color}>
            {color}
          </LinkButton>
        ))}
      </div>
    ))}
  </div>
)
```

### ComIcones

```jsx
() => (
  <div className="flex flex-wrap gap-2">
    <LinkButton navigate="#" variant="outline" leftIcon="fa-arrow-left">Voltar</LinkButton>
    <LinkButton navigate="#" rightIcon="fa-arrow-right">Avançar</LinkButton>
    <LinkButton navigate="#" variant="tint" leftIcon="fa-calendar">Ver agenda</LinkButton>
  </div>
)
```
