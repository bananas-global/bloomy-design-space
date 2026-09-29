Header from bloomy-design-space. Use via `window.Bloomy.Header` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `header/1`.

## Props

```ts
interface HeaderProps {
  className?: string;
  variant?: "small" | "large" | "default";
  children: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}
```

## Examples

### Small

```jsx
() => <Header variant="small">Título pequeno</Header>
```

### ComSubtitle

```jsx
() => (
  <Header subtitle="Ativo · 5 anos · 0 faltas · 0h semanais">Raul Tavares Rodrigues</Header>
)
```

### LargeComActions

```jsx
() => (
  <div className="max-w-2xl">
    <Header variant="large" actions={<Button size="medium" leftIcon="fa-plus">Novo programa</Button>}>
      Programas
    </Header>
  </div>
)
```
