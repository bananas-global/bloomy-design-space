Drawer from bloomy-design-space. Use via `window.Bloomy.Drawer` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface DrawerProps {
  currentPath?: string;
  className?: string;
  item: DrawerItem[];
  /** `data-collapsed` do `aside`: `true` é a barra estreita (e zero no celular). */
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: (to: string) => void;
}
```

## Related

`DrawerModal`
