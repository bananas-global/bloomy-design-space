ButtonTabs from bloomy-design-space. Use via `window.Bloomy.ButtonTabs` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ButtonTabsProps {
  id: string;
  size?: "small" | "normal";
  className?: string;
  tab: ButtonTabSlot[];
  actions?: React.ReactNode;
}
```

## Examples

### SmallComActions

```jsx
() => (
  <ButtonTabs
    id="button-tabs-small"
    actions={<Button size="medium" leftIcon="fa-plus">Novo programa</Button>}
    tab={ABAS}
  />
)
```

### SizeNormal

```jsx
() => <ButtonTabs id="button-tabs-normal" size="normal" tab={ABAS} />
```
