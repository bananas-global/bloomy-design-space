MonthPicker from bloomy-design-space. Use via `window.Bloomy.MonthPicker` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `monthpicker/1`. A visão mostra "Ago 2026"; o valor é `2026-08-01`.

## Props

```ts
interface MonthPickerProps {
  id?: string;
  label?: string;
  field: FormField;
  className?: string;
  onChange?: (value: string) => void;
}
```
