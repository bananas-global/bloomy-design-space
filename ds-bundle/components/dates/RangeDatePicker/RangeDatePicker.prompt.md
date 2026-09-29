RangeDatePicker from bloomy-design-space. Use via `window.Bloomy.RangeDatePicker` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `range_datepicker/1`. O valor é `AAAA-MM-DD#AAAA-MM-DD`.

## Props

```ts
interface RangeDatePickerProps {
  id?: string;
  label?: string;
  static?: boolean;
  field: FormField;
  className?: string;
  disable?: string[];
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  clear?: boolean;
  onChange?: (value: string) => void;
}
```

## Examples

### ComMinEMax

```jsx
() => {
  const [valor, setValor] = useState("2026-08-03#2026-08-09");
  return (
    <div className="space-y-3">
      <RangeDatePicker label="Período" field={{ id: "periodo-dias", name: "filtro[periodo]", value: valor }} onChange={setValor} minDate="2026-08-01" maxDate="2026-09-30" className="max-w-sm" />
      <Button size="small" variant="outline" onClick={() => setValor("2026-09-07#2026-09-13")}>Carregar período externo</Button>
    </div>
  );
}
```

### Vazio

```jsx
() => (
  <RangeDatePicker label="Período dos atendimentos" field={{ id: "periodo-vazio", name: "filtro[atendimentos]", value: "" }} className="max-w-sm" />
)
```

### ComErro

```jsx
() => (
  <div className="pb-6">
    <RangeDatePicker label="Período" field={{ id: "periodo-erro", name: "relatorio[periodo]", value: "", errors: ["Informe o período"] }} className="max-w-sm" />
  </div>
)
```

### Desabilitado

```jsx
() => (
  <RangeDatePicker label="Período" field={{ id: "periodo-bloq", name: "relatorio[bloq]", value: "2026-07-27#2026-07-31" }} disabled className="max-w-sm" />
)
```
