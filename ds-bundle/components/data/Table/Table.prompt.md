Table from bloomy-design-space. Use via `window.Bloomy.Table` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `table/1`.
Os slots `:col` e `:action` viram as props `col` e `action`, listas na ordem
em que os slots seriam escritos.

## Props

```ts
interface TableProps {
  id: string;
  className?: string;
  rows: T[];
  rowId?: (row: T) => string;
  rowClick?: (row: T) => void;
  emptyMessage?: string;
  rowItem?: (row: T) => I;
  col: TableCol<I>[];
  action?: ((item: I) => ReactNode)[];
}
```

## Examples

### ComColunasEAcoes

```jsx
() => (
  <Table
    id="agenda"
    rows={LINHAS}
    rowId={(l) => `agenda-${l.horario}`}
    col={[
      { label: "Horário", render: (l) => l.horario },
      { label: "Paciente", render: (l) => l.paciente },
      { label: "Serviço", render: (l) => l.servico },
      { label: "Situação", render: (l) => <StatusTag status={l.situacao} title={l.situacao ? "Ativo" : "Inativo"} /> },
    ]}
    action={[() => <a href="#">Editar</a>, () => <a href="#">Excluir</a>]}
  />
)
```

### Vazia

```jsx
() => (
  <Table
    id="agenda-vazia"
    rows={[] as typeof LINHAS}
    col={[
      { label: "Horário", render: (l) => l.horario },
      { label: "Paciente", render: (l) => l.paciente },
    ]}
  />
)
```
