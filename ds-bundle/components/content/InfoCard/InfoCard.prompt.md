InfoCard from bloomy-design-space. Use via `window.Bloomy.InfoCard` (bundle loaded from the root `_ds_bundle.js`).

`core_components.ex` → `info_card/1`.
Como no original, `class` é aceito mas não é aplicado.

## Props

```ts
interface InfoCardProps {
  title?: string;
  info?: string;
  variant: "blue" | "green" | "info" | "orange" | "accent";
  className?: string;
  icon?: string;
}
```

## Examples

### Variantes

```jsx
() => (
  <div className="flex flex-wrap gap-6">
    <InfoCard variant="blue" icon="fa-calendar-day" info="34" title="Atendimentos hoje" />
    <InfoCard variant="orange" icon="fa-clock" info="6" title="Em atraso" />
    <InfoCard variant="accent" icon="fa-users" info="128" title="Pacientes ativos" />
    <InfoCard variant="green" icon="fa-check" info="92%" title="Presença" />
    <InfoCard variant="info" icon="fa-bullhorn" info="3" title="Autorizações" />
  </div>
)
```

### SemInfo

```jsx
() => (
  <InfoCard variant="blue" icon="fa-calendar-day" title="Atendimentos hoje" />
)
```
