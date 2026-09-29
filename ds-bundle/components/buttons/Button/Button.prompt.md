Button from bloomy-design-space. Use via `window.Bloomy.Button` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ButtonProps {
  type?: "button" | "submit" | "reset";
  variant?: "default" | "tint" | "outline" | "ghost";
  color?: "purple" | "red" | "blue" | "green" | "yellow";
  size?: "small" | "medium" | "normal";
  className?: string;
  rightIcon?: string;
  leftIcon?: string;
  iconType?: "regular" | "solid";
  title?: string;
  notificationBadge?: boolean;
  children: React.ReactNode;
  id?: string;
  style?: CSSProperties;
}
```

## Examples

### VariantesECores

```jsx
() => <Grade size="normal" />
```

### TamanhoSmall

```jsx
() => <Grade size="small" />
```

### IconesEEstados

```jsx
() => (
  <div className="flex flex-wrap items-center gap-3">
    <Button leftIcon="fa-plus">Novo agendamento</Button>
    <Button rightIcon="fa-arrow-right" variant="outline">Avançar</Button>
    <Button leftIcon="fa-star" iconType="solid" variant="tint">Favorito</Button>
    <Button notificationBadge variant="tint" color="purple">Pendências</Button>
    <Button disabled>Desabilitado</Button>
  </div>
)
```

## Related

`ButtonTabs`
