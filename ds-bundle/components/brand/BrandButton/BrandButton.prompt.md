BrandButton from bloomy-design-space. Use via `window.Bloomy.BrandButton` (bundle loaded from the root `_ds_bundle.js`).

`brand_components.ex` → `brand_button/1`.

## Props

```ts
interface BrandButtonProps {
  type?: "button" | "submit" | "reset";
  color?: "purple" | "light-purple" | "red";
  size?: "small" | "normal";
  variant?: "default" | "tint";
  className?: string;
  rightIcon?: string;
  leftIcon?: string;
  children: React.ReactNode;
  id?: string;
  style?: CSSProperties;
}
```
