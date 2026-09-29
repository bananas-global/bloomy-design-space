Breadcrumbs from bloomy-design-space. Use via `window.Bloomy.Breadcrumbs` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  onNavigate?: (to: string) => void;
}
```

## Examples

### ComESemTo

```jsx
() => (
  <Breadcrumbs
    items={[
      { label: "Pacientes", to: "/backoffice/pacientes" },
      { label: "Helena Martins", to: "/backoffice/pacientes/p1" },
      { label: "Plano de Intervenção" },
    ]}
  />
)
```

### DoisNiveis

```jsx
() => (
  <Breadcrumbs items={[{ label: "Programas", to: "/backoffice/programas" }, { label: "Imitação motora" }]} />
)
```

### ItemUnico

```jsx
() => <Breadcrumbs items={[{ label: "Agenda" }]} />
```
