MultiSelect from bloomy-design-space. Use via `window.Bloomy.MultiSelect` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface MultiSelectProps {
  id: string;
  options?: MultiSelectOption[];
  field: FormField;
  label: string;
  prompt?: string;
  className?: string;
  onChange?: (ids: string[]) => void;
}
```

## Related

`MultiSelectSearch`
