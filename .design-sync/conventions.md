# Bloomy — how to build with this design system

Bloomy is an ABA therapy product for autism (programs, phases, protocols such as
ABLLS-R, applicators under supervision). UI copy is **Brazilian Portuguese**; use
product vocabulary (Paciente, Plano de Intervenção/PIC, Programa, Aplicador,
Supervisão, Unidade, Atendimento). All names and documents must be fictitious.

These components mirror the Phoenix/LiveView monolith 1:1: same names, attributes
and values as the Phoenix `attr` (camelCased; slots become props). Developers
translate `<Button variant="outline" color="red">` straight to
`<.button variant="outline" color="red">`, so **never invent a variant, color or
size**: use only the values in each `<Name>.d.ts`. If a design needs something the
system lacks, build it in the screen from utilities and call it out as new.

## Setup
No provider or wrapper is needed: components are plain React on `window.Bloomy.*`.
Everything is styled once `styles.css` is loaded (tokens, Mulish, Font Awesome Pro,
component CSS). Page background is `bg-background`; body text is `text-neutral-900`.

## Page frames
Pick a layout instead of drawing chrome by hand:
- `BackofficeLayout`: clinic back office (blue side menu, breadcrumbs, unit and
  profile, notifications). Props: `currentPath`, `breadcrumbs`, `currentUser`,
  `notifications`, `hideMenu`.
- `PatientLayout`: patient record (header card and grouped tabs), inside `BackofficeLayout`.
- `HealthCareLayout`: health-plan operator portal.
- `AuthLayout` / `BackofficeAuthLayout`: login screens. `PublicLayout`: public
  portal (totem, family). Portal screens never show the clinic menu.

## Styling idiom: Tailwind utilities on Bloomy tokens
Style your own glue (layout, spacing, text) with Tailwind classes. Use only the
Bloomy token names below; the compiled CSS guarantees them:

| Family | Real names |
|---|---|
| Neutrals | `neutral-50 … neutral-900` (`text-neutral-900` body, `text-neutral-500` secondary, `border-neutral-200`) |
| Brand | `brand-blue(-dark)`, `brand-purple(-dark,-light)`, `brand-green(-dark)`, `brand-red(-dark)`, `brand-orange(-dark)`, `brand-accent(-dark)`, `brand-info(-dark)`, `brand-neutral` |
| Status | `green`, `red`, `orange`, `cyan`, `blue`, `purple`, `pink`, plus `-light` / `-dark`; `yellow(-dark)`, `warning(-dark)` |
| Surfaces | `bg-background`, `bg-background-auth`, `bg-background-public`, `bg-white` |
| Prefixes | `bg-`, `text-`, `border-`, `ring-`, `divide-`, `fill-`, `stroke-` |
| Layout | `flex`, `grid`, `grid-cols-{1..12}` (with `sm: md: lg: xl:`), `gap-*`, `space-y-*`, `p-*`/`m-*` (0–16), `w-full`, `max-w-*`, `min-h-screen` |
| Type | `text-xs … text-4xl`, `font-normal/medium/semibold/bold/extrabold/black`, `font-mono` (Inconsolata), `truncate` |
| Shape | `rounded`, `rounded-lg`, `rounded-xl`, `rounded-full`, `shadow-main`, `border` |

Don't use Tailwind's default palette (`gray-*`, `indigo-*`…) or arbitrary hex values.

Icons are Font Awesome Pro 6 (regular and solid only): `<Icon name="fa-users" />`,
`type="solid"`, or props such as `leftIcon="fa-plus"` on `Button`.

## Where the truth lives
- `styles.css` → `_ds_bundle.css`: every token (`--color-*`) and compiled class.
- `components/<group>/<Name>/<Name>.d.ts`: the exact props and allowed values.
- `<Name>.prompt.md`: usage notes, with the Phoenix function each component mirrors.

## Example
```jsx
const { BackofficeLayout, Header, Button, Card, Table, Tag, Pagination } = window.Bloomy;

<BackofficeLayout currentPath="/backoffice/pacientes" breadcrumbs={[{ label: "Pacientes" }]}
  currentUser={{ name: "Marina Alves", units: ["Unidade Jardim"], roles: ["Coordenador"] }}>
  <Header className="mb-6" actions={<Button leftIcon="fa-plus">Novo paciente</Button>}>
    Pacientes
  </Header>
  <Card>
    <Table id="pacientes" rows={pacientes} rowId={(p) => p.id}
      col={[
        { label: "Nome", render: (p) => p.nome },
        { label: "Status", render: (p) => <Tag variant={p.ativo ? "green" : "red"} item={p.ativo ? "Ativo" : "Inativo"} /> },
      ]} />
    <div className="mt-6 flex justify-end">
      <Pagination meta={{ currentPage: 1, totalPages: 8 }} onPaginate={() => {}} />
    </div>
  </Card>
</BackofficeLayout>
```
