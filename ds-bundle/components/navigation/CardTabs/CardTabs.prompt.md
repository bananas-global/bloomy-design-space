CardTabs from bloomy-design-space. Use via `window.Bloomy.CardTabs` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface CardTabsProps {
  id: string;
  header: React.ReactNode;
  tab: CardTabSlot[];
  children?: React.ReactNode;
}
```

## Examples

### ComHeader

```jsx
() => (
  <CardTabs id="card-tabs-programa" header={<Header>Programa: Imitação motora</Header>} tab={ABAS} />
)
```

### AbaSemCartao

```jsx
() => {
  useAbaInicial("#card-tabs-programa-2-tab-2");
  return <CardTabs id="card-tabs-programa-2" header={<Header>Programa: Imitação motora</Header>} tab={ABAS} />;
}
```
