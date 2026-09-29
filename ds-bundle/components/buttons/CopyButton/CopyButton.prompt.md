CopyButton from bloomy-design-space. Use via `window.Bloomy.CopyButton` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `copy_button/1`.
O hook `CopyButton` (`assets/js/hooks/copy_button.js`) vira o `onClick`: copia
`data-text` e dispara `phx:show-toast`, que o `ToastWrapper` escuta.

## Props

```ts
interface CopyButtonProps {
  id: string;
  variant?: "default" | "tint" | "outline" | "ghost";
  color?: "purple" | "red" | "blue" | "green";
  size?: "small" | "normal";
  className?: string;
  rightIcon?: string;
  leftIcon?: string;
  title?: string;
  textToCopy: string;
  children: React.ReactNode;
  style?: CSSProperties;
}
```
