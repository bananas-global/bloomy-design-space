RangeMonthPicker from bloomy-design-space. Use via `window.Bloomy.RangeMonthPicker` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `range_monthpicker/1`. A segunda ponta vira o último dia do mês.

## Props

```ts
interface RangeMonthPickerProps {
  id?: string;
  label?: string;
  field: FormField;
  className?: string;
  disable?: string[];
  onChange?: (value: string) => void;
}
```
