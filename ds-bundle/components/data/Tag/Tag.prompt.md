Tag from bloomy-design-space. Use via `window.Bloomy.Tag` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface TagProps {
  item: string;
  title?: string;
  variant?: "purple" | "light-purple" | "red" | "dark-purple" | "blue" | "green" | "yellow" | "orange" | "light-blue" | "dark-blue" | "cyan" | "light-accent" | "light-red" | "brand";
  className?: string;
  pill?: boolean;
  leftIcon?: string;
  icon?: string;
}
```

## Examples

### Variantes

```jsx
() => (
  <div className="flex max-w-xl flex-wrap items-center gap-2">
    {TAGS.map((v) => (
      <Tag key={v} item={v} variant={v} />
    ))}
  </div>
)
```

### Pill

```jsx
() => (
  <div className="flex max-w-xl flex-wrap items-center gap-2">
    {TAGS.map((v) => (
      <Tag key={v} item={v} variant={v} pill />
    ))}
  </div>
)
```

### ComIcones

```jsx
() => (
  <div className="flex flex-wrap items-center gap-2">
    <Tag item="Padrão" variant="brand" leftIcon="fa-lock" />
    <Tag item="13" variant="orange" icon="fa-triangle-exclamation" />
    <Tag item="Criado" variant="green" />
    <Tag item="Editado" variant="light-blue" />
  </div>
)
```

## Related

`TagList`
