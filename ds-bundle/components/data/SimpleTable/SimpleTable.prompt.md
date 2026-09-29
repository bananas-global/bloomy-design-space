SimpleTable from bloomy-design-space. Use via `window.Bloomy.SimpleTable` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `simple_table/1`.
`empty_message` existe no attr, mas o original não o renderiza.

## Props

```ts
interface SimpleTableProps {
  className?: string;
  emptyMessage?: string;
  children: React.ReactNode;
}
```
