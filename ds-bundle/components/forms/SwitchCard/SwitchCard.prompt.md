SwitchCard from bloomy-design-space. Use via `window.Bloomy.SwitchCard` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `switch_card/1`. Como no original, `multiple` e
`inputValue` são aceitos mas não chegam à chave, que recebe só o `field`.

## Props

```ts
interface SwitchCardProps {
  id?: string;
  field: FormField;
  inputValue?: unknown;
  className?: string;
  multiple?: boolean;
  title: string;
  description: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}
```

## Examples

### Desligado

```jsx
() => (
  <div className="max-w-xl">
    <SwitchCard
      field={{ id: "registro-abc", name: "programa[is_abc]", value: false }}
      title="Registro Tipo ABC"
      description="Ativa o formato ABC para detalhar o comportamento com antecedentes e consequências."
    />
  </div>
)
```

### Ligado

```jsx
() => (
  <div className="max-w-xl">
    <SwitchCard
      field={{ id: "fase-manutencao", name: "programa[maintenance]", value: true }}
      title="Fase de manutenção"
      description="Mantém o programa em manutenção depois de adquirido."
    />
  </div>
)
```
