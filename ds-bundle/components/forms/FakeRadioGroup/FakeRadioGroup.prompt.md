FakeRadioGroup from bloomy-design-space. Use via `window.Bloomy.FakeRadioGroup` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `fake_radio_group/1`.

## Props

```ts
interface FakeRadioGroupProps {
  label?: string;
  selectedValue?: unknown;
  variant?: "purple" | "default";
  className?: string;
  radio: { name: string; value: unknown; label: string; }[];
}
```
