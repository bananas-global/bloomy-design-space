Modal from bloomy-design-space. Use via `window.Bloomy.Modal` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ModalProps {
  id: string;
  show?: boolean;
  title?: string;
  titleClass?: string;
  avatarUrl?: string;
  onCancel?: () => void;
  variant?: "extra_small" | "small" | "medium" | "large" | "custom";
  customSize?: string;
  withPadding?: boolean;
  customTitle?: CustomTitleSlot;
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}
```

## Examples

### AbertoInativarPaciente

```jsx
() => (
  <Palco>
  <Modal id="modal-inativar" show title="Inativar paciente" variant="small">
    <p className="text-sm text-neutral-900">
      Os atendimentos futuros de Helena Martins serão desmarcados e o plano de intervenção ficará suspenso.
    </p>
    <div className="mt-6 flex justify-end gap-2">
      <Button variant="outline">Cancelar</Button>
      <Button color="red">Inativar</Button>
    </div>
  </Modal>
  </Palco>
)
```

### ExtraSmall

```jsx
() => (
  <Palco>
  <Modal id="modal-xs" show title="Excluir alvo" variant="extra_small">
    <p className="text-sm text-neutral-900">O alvo “Bater palmas” será removido do programa Imitação motora.</p>
    <div className="mt-6 flex justify-end gap-2">
      <Button variant="outline">Cancelar</Button>
      <Button color="red">Excluir</Button>
    </div>
  </Modal>
  </Palco>
)
```

### Medium

```jsx
() => (
  <Palco>
  <Modal id="modal-medium" show title="Mapa de horas" variant="medium">
    <p className="text-sm text-neutral-900">Horas planejadas e disponíveis de Caio Nunes na semana de 03/08/2026.</p>
  </Modal>
  </Palco>
)
```

### CustomTitle

```jsx
() => (
  <Palco>
  <Modal
    id="modal-custom-title"
    show
    customTitle={{ className: "p-6", children: <h1 className="font-bold text-2xl text-blue-dark">Otávio Lima</h1> }}
  >
    <p className="text-sm text-neutral-900">Paciente em atendimento desde 03/08/2026, com Caio Nunes como aplicador.</p>
  </Modal>
  </Palco>
)
```

## Related

`ModalContent`
