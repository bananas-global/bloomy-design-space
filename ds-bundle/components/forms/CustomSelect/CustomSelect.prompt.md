CustomSelect from bloomy-design-space. Use via `window.Bloomy.CustomSelect` (bundle loaded from the root `_ds_bundle.js`).

`custom_select_component.ex` → `BloomyWeb.CustomSelectComponent`.

## Props

```ts
interface CustomSelectProps {
  id: string;
  options?: readonly SelectItem[];
  createOptions?: readonly SelectItem[];
  errors?: string[];
  name?: string;
  prompt?: string;
  label?: string;
  disabled?: boolean;
  errorTag?: Record<string, string>;
  inputClass?: string;
  clear?: boolean;
  value?: unknown;
  variant?: string;
  color?: string;
  classOptions?: string;
  onChange?: (value: string | null) => void;
}
```
