HealthCareLayout from bloomy-design-space. Use via `window.Bloomy.HealthCareLayout` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface HealthCareLayoutProps {
  currentPath?: string;
  currentHealthCareUser?: HealthCareUser;
  currentUnit?: string;
  onNavigate?: (to: string) => void;
  flash?: React.ReactNode;
  children: React.ReactNode;
}
```
