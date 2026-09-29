RadioSelector from bloomy-design-space. Use via `window.Bloomy.RadioSelector` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `radio_selector/1`.

## Props

```ts
interface RadioSelectorProps {
  label?: string;
  className?: string;
  field: FormField;
  variant?: "purple" | "default";
  radio: { value: string; title?: string; label?: string; icon?: string; warningNumber?: number; disabled?: boolean; }[];
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}
```

## Examples

### ComLabel

```jsx
() => (
  <RadioSelector
    label="Período"
    field={{ id: "periodo", name: "periodo", value: "dia" }}
    radio={[
      { value: "dia", label: "Dia" },
      { value: "semana", label: "Semana" },
      { value: "mes", label: "Mês", warningNumber: 3 },
    ]}
  />
)
```

### IconeEWarning

```jsx
() => (
  <RadioSelector
    field={{ id: "visao", name: "visao", value: "semana" }}
    radio={[
      { value: "dia", label: "Dia" },
      { value: "semana", label: "Semana" },
      { value: "lista", icon: "fa-list", title: "Lista", warningNumber: 2 },
    ]}
  />
)
```

### VariantePurple

```jsx
() => (
  <RadioSelector
    label="Visualização"
    variant="purple"
    field={{ id: "visualizacao", name: "visualizacao", value: "grafico" }}
    radio={[
      { value: "tabela", label: "Tabela" },
      { value: "grafico", label: "Gráfico" },
    ]}
  />
)
```
