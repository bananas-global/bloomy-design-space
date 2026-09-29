Avatar from bloomy-design-space. Use via `window.Bloomy.Avatar` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `avatar/1`.
Os átomos do Phoenix (`:small`, `:round`) viram strings.

## Props

```ts
interface AvatarProps {
  imageUrl?: string;
  size?: "extra_small" | "small" | "medium" | "extra_medium" | "large" | "extra_large" | "custom";
  shape?: "round" | "square";
  title?: string;
  className?: string;
  style?: CSSProperties;
}
```

## Examples

### Tamanhos

```jsx
() => (
  <div className="flex flex-wrap items-end gap-3">
    {(["extra_small", "small", "medium", "extra_medium", "large", "extra_large"] as const).map((size) => (
      <Avatar key={size} size={size} title={size} />
    ))}
  </div>
)
```

### CustomESquare

```jsx
() => (
  <div className="flex flex-wrap items-end gap-3">
    <Avatar size="custom" className="h-8 w-8" title="custom" />
    <Avatar shape="square" size="large" title="square" />
    <Avatar shape="square" size="medium" title="square medium" />
  </div>
)
```
