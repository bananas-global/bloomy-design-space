StatusTag from bloomy-design-space. Use via `window.Bloomy.StatusTag` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `status_tag/1`.

## Props

```ts
interface StatusTagProps {
  status: boolean;
  title?: string;
  className?: string;
}
```

## Examples

### AtivoEInativo

```jsx
() => (
  <div className="flex items-center gap-4 text-sm text-brand-purple-dark">
    <span className="flex items-center gap-2">
      <StatusTag status title="Ativo" /> Ativo
    </span>
    <span className="flex items-center gap-2">
      <StatusTag status={false} title="Inativo" /> Inativo
    </span>
  </div>
)
```

### EmLista

```jsx
() => (
  <div className="space-y-2 text-sm text-brand-purple-dark">
    <span className="flex items-center gap-2">
      <StatusTag status title="Ativo" /> Helena M. · Terapia ocupacional
    </span>
    <span className="flex items-center gap-2">
      <StatusTag status={false} title="Inativo" /> Otávio L. · Fonoaudiologia
    </span>
    <span className="flex items-center gap-2">
      <StatusTag status title="Ativo" /> Bruna S. · Psicologia ABA
    </span>
  </div>
)
```
