WeekSelector from bloomy-design-space. Use via `window.Bloomy.WeekSelector` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `week_selector/1`. `event` recebe o `phx-value-first/last`.

## Props

```ts
interface WeekSelectorProps {
  event: (value: { first: string; last: string; }) => void;
  range: { first: string; last: string; };
  className?: string;
}
```
