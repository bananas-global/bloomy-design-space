Checkgroup from bloomy-design-space. Use via `window.Bloomy.Checkgroup` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `checkgroup/1`. Repassa `variant`, mas a cláusula
`checkgroup` do `input/1` lê `color` — no original a variante não tem efeito.

## Props

```ts
interface CheckgroupProps {
  color?: "purple" | "default" | "default_darker";
  className?: string;
  children?: React.ReactNode;
  name?: string;
  value?: unknown;
  id?: string;
  checked?: boolean;
  multiple?: boolean;
  label?: string;
  inputValue?: unknown;
  inputClass?: string;
  innerClass?: string;
  callback?: (search: string) => SelectItem[];
  removable?: (value: unknown) => (() => void) | null | undefined | false;
  searchAction?: () => void;
  hint?: string;
  leftIcon?: string;
  rightIcon?: string;
  clear?: boolean;
  field?: FormField;
  errors?: string[];
  prompt?: string;
  options?: readonly (SelectItem | OptionTuple)[];
  createOptions?: readonly SelectItem[];
  classOptions?: string;
  errorTag?: Record<string, string>;
  aiGenerate?: AiGenerate;
  patternModule?: string;
  /** Os padrões de texto que `Bloomy.TextPatterns` devolveria para `patternModule`. */
  patterns?: TextPattern[];
  showHeadings?: boolean;
  tagLabel?: string;
  rows?: number;
  cols?: number;
  variant?: "purple" | "default";
  disabled?: boolean;
  form?: string;
  readOnly?: boolean;
  onChange?: (values: string[]) => void;
}
```

## Examples

### DiasDeAtendimento

```jsx
() => (
  <div className="max-w-3xl">
    <Checkgroup
      label="Atende nos dias da semana"
      field={{ id: "dias", name: "unit_service_hour[service_hour][weekdays]", value: ["monday", "wednesday"] }}
      innerClass="flex-row flex-wrap"
      options={DIAS}
    />
  </div>
)
```

### EmColuna

```jsx
() => (
  <div className="max-w-sm">
    <Checkgroup
      label="Documentos entregues"
      field={{ id: "documentos", name: "paciente[documentos]", value: ["rg"] }}
      options={[["Identidade", "rg"], ["CPF", "cpf"], ["Laudo médico", "laudo"]]}
    />
  </div>
)
```

### CorPurple

```jsx
() => (
  <div className="max-w-3xl">
    <Checkgroup
      color="purple"
      label="Turnos de atendimento"
      field={{ id: "turnos", name: "unidade[turnos]", value: ["manha"] }}
      innerClass="flex-row flex-wrap"
      options={[["Manhã", "manha"], ["Tarde", "tarde"], ["Noite", "noite"]]}
    />
  </div>
)
```
