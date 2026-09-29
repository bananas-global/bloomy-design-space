BackofficeLayout from bloomy-design-space. Use via `window.Bloomy.BackofficeLayout` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface BackofficeLayoutProps {
  /** Numa tela de feature, o `context` que ela recebe do motor. */
  context?: LayoutContext;
  /** `@current_path`: decide o item ativo do menu. */
  currentPath?: string;
  /** `@page_breadcrumbs`. */
  breadcrumbs?: BreadcrumbItem[];
  /** `@hide_menu`. */
  hideMenu?: boolean;
  currentUser?: CurrentUser;
  /** `@current_unit.name`. Padrão: a primeira unidade da pessoa. */
  currentUnit?: string;
  /** `@current_assistance`: com ele o cabeçalho mostra o `timer/1`. */
  currentAssistance?: TimerCustomService;
  /** Relógio de referência do `timer/1` (ISO). */
  now?: string;
  notifications?: UserNotification[];
  /** `Bloomy.University.enabled?()`. */
  universityEnabled?: boolean;
  /** Onde o `flash_group/1` do layout fica. */
  flash?: React.ReactNode;
  children: React.ReactNode;
}
```

## Examples

### ListaDePacientesNoBackoffice

```jsx
() => (
  <BackofficeLayout currentPath="/backoffice/pacientes" breadcrumbs={[{ label: "Pacientes" }]} currentUser={USUARIO} notifications={NOTIFICACOES}>
    <Header className="mb-6" actions={<Button leftIcon="fa-plus">Novo paciente</Button>}>
      Pacientes
    </Header>
    <ListaDePacientes />
  </BackofficeLayout>
)
```

### SemMenu

```jsx
() => (
  <BackofficeLayout hideMenu currentPath="/backoffice/pacientes" breadcrumbs={[{ label: "Pacientes" }]} currentUser={USUARIO} notifications={NOTIFICACOES}>
    <Header className="mb-6">Pacientes</Header>
    <ListaDePacientes />
  </BackofficeLayout>
)
```
