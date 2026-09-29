MultiTagSelect from bloomy-design-space. Use via `window.Bloomy.MultiTagSelect` (bundle loaded from the root `_ds_bundle.js`).

`multi_tag_select_component.ex` → `BloomyWeb.MultiTagSelectComponent`
(`input/1` com `type="tags"`). Enter, Tab ou sair do campo adicionam;
Backspace no campo vazio remove a última, como o hook `MultiTagSelect`.

## Props

```ts
interface MultiTagSelectProps {
  id?: string;
  name: string;
  value?: string[];
  readonly?: boolean;
  onChange?: (items: string[]) => void;
}
```

## Examples

### ComEtiquetas

```jsx
() => (
  <div className="max-w-sm">
    <MultiTagSelect id="apelidos" name="paciente[apelidos]" value={["Lelê", "Nena"]} />
  </div>
)
```

### Vazio

```jsx
() => (
  <div className="max-w-sm">
    <MultiTagSelect id="palavras" name="programa[palavras]" value={[]} />
  </div>
)
```

### SomenteLeitura

```jsx
() => (
  <div className="max-w-sm">
    <MultiTagSelect id="palavras-ro" name="programa[palavras_ro]" value={["imitação", "contato visual"]} readonly />
  </div>
)
```
