Tabs from bloomy-design-space. Use via `window.Bloomy.Tabs` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface TabsProps {
  id: string;
  className?: string;
  contentClass?: string;
  tab: TabSlot[];
}
```

## Examples

### ComMobileTitle

```jsx
() => <Tabs id="tabs-plano" tab={ABAS} />
```

### SegundaAbaAtiva

```jsx
() => {
  useAbaInicial("#tabs-plano-2-tab-1");
  return <Tabs id="tabs-plano-2" tab={ABAS} />;
}
```

### FichaDoPaciente

```jsx
() => (
  <Tabs
    id="tabs-ficha"
    tab={[
      {
        title: "Dados pessoais",
        content: (
          <div className="space-y-1 text-sm text-neutral-900">
            <p><span className="font-bold">Nome:</span> Helena Martins</p>
            <p><span className="font-bold">Nascimento:</span> 14/03/2020</p>
            <p><span className="font-bold">Responsável:</span> Marina Alves</p>
          </div>
        ),
      },
      { title: "Plano de Intervenção", content: <p className="text-sm text-neutral-900">PIC vigente até 30/11/2026.</p> },
      { title: "Documentos", content: <p className="text-sm text-neutral-900">3 documentos anexados.</p> },
      { title: "Faltas", content: <p className="text-sm text-neutral-900">Nenhuma falta no mês.</p> },
    ]}
  />
)
```
