Icon from bloomy-design-space. Use via `window.Bloomy.Icon` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface IconProps {
  /** O nome como está no monólito: `fa-users`, ou `fa-solid fa-bullhorn`. */
  name: string;
  /** `regular` é o padrão do sistema. Ignorado quando o nome já traz o estilo. */
  type?: "regular" | "solid";
  className?: string;
}
```

## Examples

### Regular

```jsx
() => (
  <div className="flex items-center gap-4 text-2xl text-brand-purple-dark">
    {NAV.map((n) => (
      <Icon key={n} name={n} />
    ))}
  </div>
)
```

### Solid

```jsx
() => (
  <div className="flex items-center gap-4 text-2xl text-brand-blue">
    {NAV.map((n) => (
      <Icon key={n} name={n} type="solid" />
    ))}
  </div>
)
```

### ComCor

```jsx
() => (
  <div className="flex items-center gap-4 text-xl">
    <Icon name="fa-check" className="text-green" />
    <Icon name="fa-times" className="text-red" />
    <Icon name="fa-triangle-exclamation" className="text-orange" />
    <Icon name="fa-solid fa-bullhorn" className="text-brand-accent" />
  </div>
)
```
