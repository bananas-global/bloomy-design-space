LazyTabs from bloomy-design-space. Use via `window.Bloomy.LazyTabs` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface LazyTabsProps {
  id: string;
  tabs: Maybe<LazyTabEntry>[];
  opts?: { card?: boolean; };
  activeTab?: string;
  header?: React.ReactNode;
}
```
