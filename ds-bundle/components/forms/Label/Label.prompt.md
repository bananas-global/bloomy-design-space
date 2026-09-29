Label from bloomy-design-space. Use via `window.Bloomy.Label` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `label/1`.

## Props

```ts
interface LabelProps {
  htmlFor?: string;
  className?: string;
  color?: string;
  children?: React.ReactNode;
}
```

## Examples

### Cores

```jsx
() => (
  <div className="space-y-2">
    <Label>Nome do paciente</Label>
    <Label color="purple">Perfil de acesso</Label>
  </div>
)
```

### ComCampo

```jsx
() => (
  <div className="max-w-sm space-y-2">
    <Label htmlFor="responsavel">Responsável legal</Label>
    <p className="text-sm text-neutral-500">Mariana Albuquerque</p>
  </div>
)
```
