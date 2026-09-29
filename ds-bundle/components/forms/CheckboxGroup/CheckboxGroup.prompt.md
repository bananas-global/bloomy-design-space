CheckboxGroup from bloomy-design-space. Use via `window.Bloomy.CheckboxGroup` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `checkbox_group/1`.

## Props

```ts
interface CheckboxGroupProps {
  label: string;
  className?: string;
  wrapperClass?: string;
  field: FormField;
  checkbox: { value: string; label: string; disable?: boolean; }[];
  required?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}
```

## Examples

### Especialidades

```jsx
() => (
  <CheckboxGroup
    label="Especialidades"
    field={{ id: "especialidades", name: "especialidades", value: ["fono"] }}
    checkbox={[
      { value: "fono", label: "Fonoaudiologia" },
      { value: "to", label: "Terapia ocupacional" },
      { value: "psico", label: "Psicologia" },
    ]}
  />
)
```

### ComDesabilitada

```jsx
() => (
  <CheckboxGroup
    label="Documentos entregues"
    field={{ id: "documentos", name: "documentos", value: ["rg", "cpf"] }}
    checkbox={[
      { value: "rg", label: "Identidade" },
      { value: "cpf", label: "CPF" },
      { value: "laudo", label: "Laudo", disable: true },
    ]}
  />
)
```
