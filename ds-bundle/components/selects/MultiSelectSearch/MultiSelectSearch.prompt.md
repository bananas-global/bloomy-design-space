MultiSelectSearch from bloomy-design-space. Use via `window.Bloomy.MultiSelectSearch` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface MultiSelectSearchProps {
  id: string;
  options?: readonly SelectItem[];
  createOptions?: readonly SelectItem[];
  errors?: string[];
  name: string;
  prompt?: string;
  label?: string;
  callback?: (search: string) => SelectItem[];
  disabled?: boolean;
  leftIcon?: string;
  searchAction?: () => void;
  classOptions?: string;
  value?: string[];
  onChange?: (values: string[]) => void;
}
```

## Examples

### ComSelecionadas

```jsx
() => (
  <div className="max-w-sm">
    <MultiSelectSearch id="especialidades" name="programa[especialidades]" label="Especialidades" prompt="Selecione" options={ESPECIALIDADES} value={["aba", "psychology"]} callback={buscar} />
  </div>
)
```

### Vazio

```jsx
() => (
  <div className="max-w-sm">
    <MultiSelectSearch id="especialidades-vazio" name="programa[especialidades]" label="Especialidades" prompt="Selecione" options={ESPECIALIDADES} callback={buscar} />
  </div>
)
```

### Agrupadas

```jsx
() => (
  <div className="max-w-sm">
    <MultiSelectSearch id="programas" name="plano[programas]" label="Programas" prompt="Selecione" options={PROGRAMAS_AGRUPADOS} value={["imitacao"]} />
  </div>
)
```

### MuitasSelecionadas

```jsx
() => (
  <div className="max-w-sm">
    <MultiSelectSearch id="especialidades-equipe" name="equipe[especialidades]" label="Especialidades da equipe" prompt="Selecione" options={ESPECIALIDADES} value={["aba", "speech-therapy", "psychology", "occupational-therapy"]} callback={buscar} />
  </div>
)
```
