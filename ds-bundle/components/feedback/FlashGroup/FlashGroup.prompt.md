FlashGroup from bloomy-design-space. Use via `window.Bloomy.FlashGroup` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `flash_group/1`.
Os avisos `client-error` e `server-error` nascem `hidden`; no original quem os
mostra é a conexão do LiveView (`phx-disconnected`), que não existe aqui.

## Props

```ts
interface FlashGroupProps {
  flash: Partial<Record<FlashKind, ReactNode>>;
  id?: string;
}
```
