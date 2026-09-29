EmptyStateCard from bloomy-design-space. Use via `window.Bloomy.EmptyStateCard` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `empty_state_card/1`.

## Props

```ts
interface EmptyStateCardProps {
  icon: string;
  text: string;
  className?: string;
  children?: React.ReactNode;
}
```

## Examples

### ComInnerBlock

```jsx
() => (
  <EmptyStateCard icon="fa-calendar-day" text="Nenhum atendimento para hoje">
    Os agendamentos criados na recepção aparecem aqui.
  </EmptyStateCard>
)
```

### SemInnerBlock

```jsx
() => <EmptyStateCard icon="fa-folder-open" text="Nenhum documento" />
```
