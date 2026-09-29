PatientLayout from bloomy-design-space. Use via `window.Bloomy.PatientLayout` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface PatientLayoutProps {
  context?: Pick<LayoutContext, "can">;
  patient: PatientHeader;
  /** `@initial_tab`: `:treatment_plan` quando a URL traz `objective_id`. */
  activeTab?: unknown;
  /** O conteúdo de cada aba (o `component` de cada uma no original). */
  renderTab?: (tab: PatientTabId) => ReactNode;
}
```

## Examples

### PaginaDoPaciente

```jsx
() => (
  <BackofficeLayout
    currentPath="/backoffice/pacientes/p1"
    breadcrumbs={[{ label: "Pacientes", to: "/backoffice/pacientes" }, { label: "Helena Martins" }]}
    currentUser={USUARIO}
    notifications={NOTIFICACOES}
  >
    <PatientLayout
      patient={{
        name: "Helena Martins",
        status: "Ativo",
        supportLevel: 2,
        restrictions: true,
        age: 6,
        unitName: "Unidade Jardim",
        missedCancelledCount: 3,
        activeWeeklyHours: 12,
        observation: "Prefere atividades com blocos no início da sessão.",
      }}
      renderTab={(tab) =>
        tab === "personal_info" ? (
          <List item={DADOS} />
        ) : (
          <p>
            Conteúdo da aba <span>{tab}</span>.
          </p>
        )
      }
    />
  </BackofficeLayout>
)
```
