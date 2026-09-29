RadioGroup from bloomy-design-space. Use via `window.Bloomy.RadioGroup` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `radio_group/1`.

## Props

```ts
interface RadioGroupProps {
  label: string;
  className?: string;
  wrapperClass?: string;
  field: FormField;
  variant?: "purple" | "default";
  radio: { value: string; label: string; disabled?: boolean; removable?: () => void; }[];
  required?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}
```

## Examples

### Presenca

```jsx
() => (
  <RadioGroup
    label="Presença"
    field={{ id: "presenca", name: "presenca", value: "presente" }}
    radio={[
      { value: "presente", label: "Presente" },
      { value: "ausente", label: "Ausente" },
      { value: "justificada", label: "Falta justificada" },
    ]}
  />
)
```

### VariantePurple

```jsx
() => (
  <RadioGroup
    label="Tipo de registro"
    variant="purple"
    field={{ id: "registro", name: "programa[registro]", value: "abc" }}
    radio={[
      { value: "tentativas", label: "Tentativas" },
      { value: "abc", label: "Registro ABC" },
      { value: "duracao", label: "Duração" },
    ]}
  />
)
```

### ComDesabilitada

```jsx
() => (
  <RadioGroup
    label="Fase do programa"
    field={{ id: "fase", name: "programa[fase]", value: "linha-de-base" }}
    radio={[
      { value: "linha-de-base", label: "Linha de base" },
      { value: "intervencao", label: "Intervenção" },
      { value: "manutencao", label: "Manutenção", disabled: true },
    ]}
  />
)
```
