DropdownTabs from bloomy-design-space. Use via `window.Bloomy.DropdownTabs` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface DropdownTabsProps {
  id: string;
  /** `[{id, title}]` do original: a lista de `{id, title}` das abas de topo. */
  headers: [string, string][];
  header?: React.ReactNode;
  tab: DropdownTabSlot[];
}
```
