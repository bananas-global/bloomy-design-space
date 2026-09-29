# design-sync notes — Bloomy Design Space

## Build
- The repo is a Vite app, not a library. `.design-sync/pkg/` is a wrapper package
  (`name: bloomy-design-space`) whose `build.mjs` runs the repo's own Vite (lib mode,
  React external) + tsc to produce `pkg/dist/` and `pkg/types/`. Converter runs with
  `--entry .design-sync/pkg/dist/index.js --node-modules ./node_modules`.
- The barrel `pkg/index.ts` lists every file in `src/components` and `src/layouts`.
  **A new component file must be added there** (and to `componentSrcMap`/`docsMap`).
- `pkg/bloomy.css` compiles Tailwind v4 from `src/tokens/bloomy.generated.css`, scans
  `src/` and `.design-sync/previews/`, and safelists a layout/token vocabulary via
  `@source inline(...)` for the design agent's glue code.
- Utility classes used in previews only enter the CSS on a full `buildCmd` run
  (`preview-rebuild.mjs` does not recompile CSS). Classes already used anywhere in
  `src/` (e.g. `src/catalog`) or in the safelist always exist.
- Fonts are kept out of Vite (lib mode would inline them as data-URIs): build.mjs
  appends Font Awesome regular/solid + Mulish (from tokens.css) + Inconsolata with
  unquoted `url(./fonts/...)`. Quoted urls get dropped by the converter's
  rewriteBundleFontFaces.
- Inconsolata (`--font-mono`) is copied from the monolith's
  `priv/static/fonts/inconsolata/` into `pkg/fonts/`; the app itself doesn't load it.
- Font Awesome Brands/Duotone/Sharp are referenced by fontawesome.min.css but the
  monolith only loads regular + solid → `runtimeFontPrefixes` silences them.
- Playwright: repo pins 1.63 (chromium 1243, not cached); `.ds-sync` uses
  playwright@1.62.0 (chromium 1234, cached in ~/Library/Caches/ms-playwright).

## Groups
- Groups come from category-only stubs in `.design-sync/docs/<group>.md`, mapped per
  component in `docsMap` (source file → group; exceptions: Breadcrumbs→navigation,
  Drawer→overlays, ToastWrapper→feedback, Avatar/Kbd/Progress→data, SimpleForm→forms).

## Previews
- Authored previews port the demos in `src/catalog/components.tsx` / `layouts.tsx`
  (realistic PT-BR data, fictitious names). Import from `"bloomy-design-space"`.
- Components that are faithful to Phoenix quirks (e.g. Button `disabled` has no
  visual change) are graded on fidelity, not on "better" design.
- Single-mode cards (`cardMode: single`) render `primaryStory`, else the
  ALPHABETICALLY first export. Always set `primaryStory` for single-mode overrides.
- `position: fixed` components (Modal, Flash; likely DrawerModal, ToastWrapper,
  FlashGroup) collapse in single cards: the card template's
  `.ds-single{transform:translateZ(0)}` makes the 0px-tall root their containing
  block. Workaround in the preview: wrap each export in `<div className="h-screen">`
  (the `Palco` helper in Modal.tsx / Flash.tsx). Don't fork emit.mjs for this.
- Overlays open statically: Modal via `show`; Flash is visible when it has content;
  Dropdown has no open prop, so the preview clicks `#<id> [data-button]` on mount (ref guard);
  Tooltip dispatches a bubbling `mouseover` on `#<id> [data-tooltip-trigger]`;
  Tabs/CardTabs "second tab" cells click `#<id>-tab-N` on mount.
- Layouts render without the engine `context` (BackofficeLayout falls back to Admin
  permissions → full menu). Assets the package doesn't export (logos) are imported by
  relative path `../../src/assets/...` in previews (loaded as data URLs).
- Don't name a preview export `Error` (shadows the global).

## Faithful quirks (graded on fidelity, not "fixed")
- Button `disabled`: no visual change. Tag `light-red`: no class.
- LinkButton `color="purple"` + `variant="tint"`: white text on pale background.
- RadioSelector `variant="purple"` only recolors the label. Checkgroup `variant` is a
  no-op; `color` tints.
- SelectSearch/MultiSelectSearch `errors` and MultiSelectSearch `disabled` only reach the
  search input inside the closed panel → no visible change; those cells were dropped.
- RangeDatePicker `disabled` still shows the clear X. MultiTagSelect read-only looks
  editable and has no `label` prop (the label lives in `Input type="tags"`).

## Known render warns (floor cards)
- Unauthored components show floor renders from `.d.ts` defaults, some with placeholder
  artifacts ("undefined undefined" in DateNavigator, "NaN" in MetaInfo) or thin text
  (InputSwitchCard, ModalContent). These are floor cards, authorable on a later sync.

## Re-sync
- Order: `node .design-sync/pkg/build.mjs` (buildCmd) → re-stage `.ds-sync/` →
  `(cd .ds-sync && npm i esbuild ts-morph @types/react playwright@1.62.0)` → fetch
  `_ds_sync.json` → `resync.mjs --entry .design-sync/pkg/dist/index.js --node-modules ./node_modules`.

## Re-sync risks
- **New or renamed component files** don't appear until they're added to
  `pkg/index.ts`, `componentSrcMap` and `docsMap`. The barrel is a hand list.
- **Token changes** (`pnpm sync:tokens`) change the compiled CSS, so rebuild and re-upload.
  The safelist in `pkg/bloomy.css` hard-codes the token names: add new color tokens
  there, and update the family table in `conventions.md`.
- **Inconsolata** is a copy of the monolith's file in `pkg/fonts/`, so it can go stale
  if the monolith changes its mono font.
- **Playwright pin** follows the cached Chromium build (1234 → 1.62.0). A different
  machine or cache needs a matching version.
- **Overlay previews** open by simulating DOM events (Dropdown click, Tooltip
  mouseover, Tabs click) against `data-*` hooks in the source. If those hooks
  change, the cards silently show the closed state. Recheck the Modal, Flash,
  Dropdown, Tooltip, Tabs and CardTabs sheets.
- **Floor-card components (46)** were only render-checked, not graded. They're the
  standing offer for authoring on a later sync.
- **Tooltip** sits in the "forms" group because it lives in `Choice.tsx`. Regroup it
  via `docsMap` if that bothers anyone (it moves the path, and the diff will delete the old one).
