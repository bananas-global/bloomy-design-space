Card from bloomy-design-space. Use via `window.Bloomy.Card` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `card/1`.

## Props

```ts
interface CardProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}
```

## Examples

### Padrao

```jsx
() => (
  <Card className="w-64">
    <p className="text-sm text-brand-purple-dark">Cartão padrão, fundo branco.</p>
  </Card>
)
```

### ComFundo

```jsx
() => (
  <Card className="w-64 bg-brand-blue/20">
    <p className="text-sm text-brand-purple-dark">class=&quot;bg-brand-blue/20&quot;</p>
  </Card>
)
```

## Related

`CardTabs`
