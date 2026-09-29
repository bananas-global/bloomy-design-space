ModalContent from bloomy-design-space. Use via `window.Bloomy.ModalContent` (bundle loaded from the root `_ds_bundle.js`).

Tela secundária de um modal de várias telas. O botão de voltar tem
`data-close-screen`, que o `MultiStepModal` escuta; aqui é `onClose`.

## Props

```ts
interface ModalContentProps {
  title: string;
  className?: string;
  onClose?: () => void;
  children: React.ReactNode;
  id?: string;
  style?: CSSProperties;
}
```
