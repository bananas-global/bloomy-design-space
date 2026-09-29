NotificationComponent from bloomy-design-space. Use via `window.Bloomy.NotificationComponent` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface NotificationComponentProps {
  notifications?: UserNotification[];
  /** Padrão: as não lidas de `notifications`. */
  unreadCount?: number;
  onNavigate?: (to: string) => void;
}
```
