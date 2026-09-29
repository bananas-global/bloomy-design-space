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

# Bloomy (bloomy-design-space@0.1.0)

This design system is the published bloomy-design-space React library, bundled as a single
browser global. All 80 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.Bloomy`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.Bloomy.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { AuthLayout } = window.Bloomy;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<AuthLayout />);
```

## Tokens

183 CSS custom properties from bloomy-design-space. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **color** (85): `--tw-border-style`, `--tw-shadow-color`, `--tw-inset-shadow-color`, …
- **spacing** (6): `--tw-space-y-reverse`, `--tw-space-x-reverse`, `--tw-inset-shadow`, …
- **typography** (17): `--tw-font-weight`, `--tw-tracking`, `--font-sans`, …
- **radius** (4): `--radius-md`, `--radius-lg`, `--radius-xl`, …
- **shadow** (7): `--tw-shadow`, `--tw-shadow-alpha`, `--tw-ring-shadow`, …
- **other** (64): `--fa-animation-direction`, `--tw-translate-x`, `--tw-translate-y`, …

## Components

### layouts
- `AuthLayout` — layouts/auth.html.heex (login da equipe, da famlia e da operadora) e
- `BackofficeAuthLayout`
- `BackofficeLayout`
- `HealthCareLayout`
- `PatientCardHeader` — CardHeader.render/1.
- `PatientLayout`
- `PublicLayout` — layouts/public.html.heex: totem, anamnese e demais pginas abertas por link.

### data
- `Avatar` — core_components.ex  avatar/1.
- `Icon`
- `Kbd` — core_components.ex  kbd/1.
- `Progress` — core_components.ex  progress/1.
- `SimpleTable` — core_components.ex  simple_table/1.
- `StatusTag` — core_components.ex  status_tag/1.
- `Table` — core_components.ex  table/1.
- `Tag`
- `TagList` — core_components.ex  tag_list/1.

### content
- `Back` — core_components.ex  back/1. .link navigate vira a href.
- `Card` — core_components.ex  card/1.
- `EmptyStateCard` — core_components.ex  empty_state_card/1.
- `FormGrid`
- `Header` — core_components.ex  header/1.
- `InfoCard` — core_components.ex  info_card/1.
- `InsideCard` — core_components.ex  inside_card/1.
- `List` — core_components.ex  list/1.
- `LoadingCard` — core_components.ex  loading_card/1.
- `MetaInfo` — core_components.ex  meta_info/1.
- `TimelineList` — core_components.ex  timeline_list/1.
- `Timer`

### brand
- `BrandButton` — brand_components.ex  brand_button/1.
- `BrandInput` — brand_components.ex  brand_input/1.

### navigation
- `Breadcrumbs`
- `ButtonTabs`
- `CardTabs`
- `DropdownTabs`
- `LazyTabs`
- `Pagination`
- `Tabs`

### buttons
- `Button`
- `CopyButton` — core_components.ex  copy_button/1.
- `LinkButton` — core_components.ex  link_button/1.

### forms
- `CheckboxGroup` — core_components.ex  checkbox_group/1.
- `Checkgroup` — core_components.ex  checkgroup/1. Repassa variant, mas a clusula
- `CustomSelect` — custom_select_component.ex  BloomyWeb.CustomSelectComponent.
- `FakeInput` — core_components.ex  fake_input/1.
- `FakeRadioGroup` — core_components.ex  fake_radio_group/1.
- `FieldError` — core_components.ex  error/1.
- `Input`
- `InputSwitchCard` — core_components.ex  input_switch_card/1.
- `InputWithSelect` — core_components.ex  input_with_select/1.
- `Label` — core_components.ex  label/1.
- `RadioCards` — core_components.ex  radio_cards/1.
- `RadioGroup` — core_components.ex  radio_group/1.
- `RadioSelector` — core_components.ex  radio_selector/1.
- `RichText`
- `SimpleForm` — core_components.ex  simple_form/1.
- `SwitchCard` — core_components.ex  switch_card/1. Como no original, multiple e
- `Tooltip` — core_components.ex  tooltip/1. Como o hook Tooltip: o contedo vai

### dates
- `DateNavigator` — core_components.ex  date_navigator/1. Como no original, o texto inicial
- `MonthPicker` — core_components.ex  monthpicker/1. A viso mostra Ago 2026 o valor  2026-08-01.
- `RangeDatePicker` — core_components.ex  range_datepicker/1. O valor  AAAA-MM-DDAAAA-MM-DD.
- `RangeMonthPicker` — core_components.ex  range_monthpicker/1. A segunda ponta vira o ltimo dia do ms.
- `WeekSelector` — core_components.ex  week_selector/1. event recebe o phx-value-first/last.

### overlays
- `Drawer`
- `DrawerModal`
- `Dropdown`
- `DropdownMenu`
- `Modal`
- `ModalContent` — Tela secundria de um modal de vrias telas. O boto de voltar tem

### uploads
- `FileItem` — file_uploader_components.ex  item/1.
- `FileUploader`
- `ImageUpload` — core_components.ex  image_upload/1. O live_img_preview da ltima

### feedback
- `Flash` — core_components.ex  flash/1.
- `FlashGroup` — core_components.ex  flash_group/1.
- `NotificationComponent`
- `ToastWrapper` — backoffice_components.ex  toast_wrapper/1.

### selects
- `MultiSelect`
- `MultiSelectSearch`
- `MultiTagSelect` — multi_tag_select_component.ex  BloomyWeb.MultiTagSelectComponent
- `SearchBar` — A barra de busca do painel, comum a SelectSearch e MultiSelectSearch.
- `SelectSearch`
