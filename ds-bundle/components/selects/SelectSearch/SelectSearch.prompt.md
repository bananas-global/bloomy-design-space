SelectSearch from bloomy-design-space. Use via `window.Bloomy.SelectSearch` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface SelectSearchProps {
  id: string;
  options?: readonly SelectItem[];
  createOptions?: readonly SelectItem[];
  errors?: string[];
  name?: string;
  prompt?: string;
  label?: string;
  callback?: (search: string) => SelectItem[];
  disabled?: boolean;
  searchAction?: () => void;
  leftIcon?: string;
  className?: string;
  classOptions?: string;
  value?: unknown;
  onChange?: (value: string | null) => void;
}
```

## Examples

### Vazio

```jsx
() => (
  <div className="max-w-sm">
    <SelectSearch id="especialidade" name="profissional[especialidade]" label="Especialidade" prompt="Buscar especialidade" options={ESPECIALIDADES} callback={buscar} />
  </div>
)
```

### ComValorEIcone

```jsx
() => (
  <div className="max-w-sm">
    <SelectSearch id="profissional" name="agenda[profissional]" label="Profissional" prompt="Buscar" leftIcon="fa-user" options={ESPECIALIDADES} callback={buscar} searchAction={() => undefined} value="speech-therapy" />
  </div>
)
```

### Desabilitado

```jsx
() => (
  <div className="max-w-sm">
    <SelectSearch id="especialidade-bloqueada" name="profissional[especialidade]" label="Especialidade indisponível" prompt="Buscar especialidade" options={ESPECIALIDADES} value="psychology" disabled />
  </div>
)
```
