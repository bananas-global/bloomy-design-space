DrawerModal from bloomy-design-space. Use via `window.Bloomy.DrawerModal` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface DrawerModalProps {
  id: string;
  show?: boolean;
  title?: string;
  titleClass?: string;
  avatarUrl?: string;
  onCancel?: () => void;
  placement?: "left" | "right";
  variant?: "extra_small" | "small" | "medium" | "large" | "custom";
  customSize?: string;
  headerClass?: string;
  contentClass?: string;
  customTitle?: CustomTitleSlot;
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}
```
