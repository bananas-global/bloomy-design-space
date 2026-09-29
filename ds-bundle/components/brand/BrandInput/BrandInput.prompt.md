BrandInput from bloomy-design-space. Use via `window.Bloomy.BrandInput` (bundle loaded from the root `_ds_bundle.js`).

`brand_components.ex` → `brand_input/1`.

## Props

```ts
interface BrandInputProps {
  id?: string;
  name?: string;
  value?: unknown;
  className?: string;
  color?: "white" | "dark-purple";
  type?: "text" | "password" | "email";
  field?: FormField;
  errors?: string[];
  errorTag?: Record<string, string>;
  children?: React.ReactNode;
  style?: CSSProperties;
}
```
