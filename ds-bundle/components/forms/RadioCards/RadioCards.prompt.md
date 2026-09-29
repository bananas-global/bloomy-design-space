RadioCards from bloomy-design-space. Use via `window.Bloomy.RadioCards` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `radio_cards/1`.

## Props

```ts
interface RadioCardsProps {
  id: string;
  value?: string;
  name?: string;
  title?: string;
  option: { id: string; title: string; subtitle?: string; badge?: string; icon?: string; children?: ReactNode; }[];
  /** O `phx-click="select-option"` com `phx-value-value`. */
  onChange?: (value: string) => void;
}
```
