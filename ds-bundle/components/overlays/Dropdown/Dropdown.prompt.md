Dropdown from bloomy-design-space. Use via `window.Bloomy.Dropdown` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface DropdownProps {
  id?: string;
  className?: string;
  dropdownClass?: string;
  placement?: "bottom-end" | "bottom-start" | "bottom";
  items: React.ReactNode;
  children: React.ReactNode;
}
```

## Examples

### AbertoBottomStart

```jsx
() => <Aberto id="drop-aberto-start" placement="bottom-start" />
```

### AbertoBottomEnd

```jsx
() => <Aberto id="drop-aberto-end" placement="bottom-end" />
```

### Fechado

```jsx
() => (
  <Dropdown id="drop-fechado" items={<Itens />}>
    <Button variant="outline" size="medium">Selecionar unidade</Button>
  </Dropdown>
)
```

## Related

`DropdownMenu`, `DropdownTabs`
