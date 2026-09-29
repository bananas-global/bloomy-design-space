Timer from bloomy-design-space. Use via `window.Bloomy.Timer` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface TimerProps {
  customService: TimerCustomService;
  /** Relógio de referência (ISO). O componente não lê a hora do sistema; conta a partir daqui. */
  now: string;
  className?: string;
  onNavigate?: (to: string) => void;
}
```
