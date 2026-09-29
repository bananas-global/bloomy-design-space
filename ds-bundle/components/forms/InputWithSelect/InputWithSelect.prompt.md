InputWithSelect from bloomy-design-space. Use via `window.Bloomy.InputWithSelect` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `input_with_select/1`.

## Props

```ts
interface InputWithSelectProps {
  label?: string;
  textField: FormField;
  selectField: FormField;
  options?: readonly (SelectItem | OptionTuple)[];
  disabled?: boolean;
  className?: string;
}
```
