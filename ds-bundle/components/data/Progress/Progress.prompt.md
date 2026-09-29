Progress from bloomy-design-space. Use via `window.Bloomy.Progress` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `progress/1`.

## Props

```ts
interface ProgressProps {
  value: number;
  variant?: "purple" | "default" | "error" | "accent";
  showPercentage?: boolean;
  className?: string;
  id?: string;
  style?: CSSProperties;
}
```
