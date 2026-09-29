FileItem from bloomy-design-space. Use via `window.Bloomy.FileItem` (bundle loaded from the root `_ds_bundle.js`).

`file_uploader_components.ex` → `item/1`.

## Props

```ts
interface FileItemProps {
  fileName: string;
  size: number;
  url?: string;
  removeEvent?: (id: unknown) => void;
  removeId?: unknown;
  target?: unknown;
  category?: "normal" | "certificate" | "administrative" | "clinical" | "personal";
  variant?: "default" | "simplified";
}
```
