PublicLayout from bloomy-design-space. Use via `window.Bloomy.PublicLayout` (bundle loaded from the root `_ds_bundle.js`).

`layouts/public.html.heex`: totem, anamnese e demais páginas abertas por link.
O layout é só o fundo; o cabeçalho com o logotipo é de cada página (ver o
preview, copiado de `Public.AutoCheckinLive.Show`).

## Props

```ts
interface PublicLayoutProps {
  flash?: React.ReactNode;
  children: React.ReactNode;
}
```
