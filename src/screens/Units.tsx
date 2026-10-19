/**
 * Unidades — a lista do backoffice com duas visões no mesmo card.
 *
 * No monólito, `UnitLive.Index` é só a lista (Cadastro). Aqui ela fica atrás
 * de um `button_tabs`, com uma segunda visão nova, Documentação: a matriz dos
 * documentos padrão de cada unidade, no mesmo desenho e comportamento da
 * Documentação de Profissionais.
 *
 * Novo — não existe no Phoenix: o `button_tabs` com as duas visões, a visão
 * Documentação e o seu drawer, o ponto de status no nome e a tag na
 * coluna "Ativa?" (no `index.ex` é o texto Sim/Não).
 */
import { useState } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { LinkButton, showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Icon } from "../components/Icon.js";
import { Header, MetaInfo } from "../components/Layout.js";
import { Pagination } from "../components/Pagination.js";
import { SimpleTable } from "../components/Table.js";
import { Tag } from "../components/Tag.js";
import { ButtonTabs, titleToSlug, useTrackedTab } from "../components/Tabs.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { DocDrawer } from "./unidades/drawers.js";
import { UNITS_FIXTURES, type UnitsFixture, type UnitsView } from "./unidades/fixtures.js";
import {
  addressLine,
  byActive,
  digits,
  DOC_GROUPS,
  DOC_STATES,
  matchesSituation,
  norm,
  slotsOf,
  type CategoryFilter,
  type DocCell,
  type DocSituation,
  type Unit,
} from "./unidades/model.js";
import { CellBox, Completeness, NameCell, Rollup, SearchFilter, SelectFilter } from "./unidades/parts.js";
import { DocsProvider, useDocs } from "./unidades/store.js";

export const UNITS_PATH = "/backoffice/unidades";

const CURRENT_USER = {
  name: "Marina Alves",
  units: ["Unidade Teste", "Santana"],
  roles: [],
  professional: false,
};

const fixtureOf = (context: ScenarioContext): UnitsFixture => {
  const data = context.data as UnitsFixture | undefined;
  if (data) return data;
  const first = UNITS_FIXTURES[0]!.data;
  return typeof first === "function" ? first() : first;
};

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const unique = (values: string[]) => [...new Set(values)];
const pairs = (values: string[]) => values.map((v) => [v, v] as const);

/** Linhas de 60px, como na lista de Profissionais. */
const ROWS = "[&_tbody_tr_td]:h-[60px] [&_tbody_tr_td]:py-1.5!";

/**
 * O `row_click` do Phoenix navega para `/backoffice/unidades/:id/editar` (ou
 * `/backoffice/unidades/:id` sem permissão de editar). A ficha não tem rota
 * nesta branch (as abas dela vêm em outros PRs); navegar daria "Nenhuma rota",
 * então o preview avisa para onde o clique leva.
 */
const openUnit = (u: Unit) =>
  showToast({ type: "info", title: "Abre a ficha da unidade", content: `No sistema, o clique abre ${UNITS_PATH}/${u.id}/editar, a ficha de ${u.name}.`, closeTime: 4000 });

/** O filtro Status da Documentação. */
const STATUS_OPTIONS: [string, string][] = [
  ["Ativa", "active"],
  ["Inativa", "inactive"],
];

const matchesStatus = (u: Unit, status: string) => !status || (status === "active") === u.active;

/* ------------------------------------------------------------------ */
/* Cadastro                                                            */
/* ------------------------------------------------------------------ */

function RegistryView({ units }: { units: Unit[] }) {
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cnes, setCnes] = useState("");
  const [city, setCity] = useState("");

  // Os quatro filtros do `index.ex`, como o `Units.list`: busca por trecho.
  const rows = units
    .filter((u) => !name || norm(u.name).includes(norm(name)))
    .filter((u) => !cnpj || digits(u.cnpj).includes(digits(cnpj)))
    .filter((u) => !cnes || digits(u.cnes).includes(digits(cnes)))
    .filter((u) => !city || norm(u.address.city).includes(norm(city)))
    .sort(byActive);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <SearchFilter id="filters_name" label="Nome" value={name} onChange={setName} />
        <SearchFilter id="filters_cnpj" label="CNPJ" value={cnpj} onChange={setCnpj} />
        <SearchFilter id="filters_cnes" label="CNES" value={cnes} onChange={setCnes} />
        <SearchFilter id="filters_city" label="Cidade" value={city} onChange={setCity} />
      </div>

      <SimpleTable className={cx("mt-4", ROWS)}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>CNPJ</th>
            <th>CNES</th>
            <th>Endereço</th>
            <th>Cidade</th>
            <th>Ativa?</th>
          </tr>
        </thead>
        <tbody id="units">
          {rows.map((u) => (
            <UnitRow key={u.id} unit={u} onClick={() => openUnit(u)}>
              <td className="whitespace-nowrap">{u.cnpj}</td>
              <td>{u.cnes}</td>
              <td>{addressLine(u.address)}</td>
              <td>{u.address.city}</td>
              <td>
                <Tag item={u.active ? "Sim" : "Não"} variant={u.active ? "green" : "red"} />
              </td>
            </UnitRow>
          ))}
          <EmptyRow colSpan={6} show={rows.length === 0} />
        </tbody>
      </SimpleTable>

      {/* `meta_info` e `pagination` do `index.ex`: tudo cabe numa página. */}
      <div className="mt-4 flex items-center justify-between">
        <MetaInfo meta={{ totalCount: rows.length, currentOffset: 0, pageSize: 20 }} />
        <Pagination meta={{ currentPage: 1, totalPages: 1 }} path={UNITS_PATH} onPaginate={() => {}} />
      </div>
    </>
  );
}

/** A linha de uma unidade: o nome com o status; inativa, a linha esmaecida. */
function UnitRow({ unit, onClick, children }: { unit: Unit; onClick?: () => void; children: React.ReactNode }) {
  return (
    <tr id={unit.id} onClick={onClick} className={cx(onClick && "cursor-pointer", !unit.active && "[&>td]:text-brand-purple-dark/60")}>
      <td>
        <NameCell unit={unit} />
      </td>
      {children}
    </tr>
  );
}

function EmptyRow({ colSpan, show, children = "Nenhum dado encontrado para a pesquisa" }: { colSpan: number; show: boolean; children?: string }) {
  if (!show) return null;
  return (
    <tr>
      <td colSpan={colSpan} className="text-center! px-3 py-4 text-brand-purple-dark/40">
        {children}
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Documentação                                                        */
/* ------------------------------------------------------------------ */

const SITUATIONS: [string, DocSituation][] = [
  ["Vencidos", "vencido"],
  ["Pendentes", "pendente"],
  ["A vencer", "a_vencer"],
  ["Aguardando vigência", "aguardando"],
  ["Em dia", "em_dia"],
];

function DocsView({ units }: { units: Unit[] }) {
  const { rows: allRows } = useDocs();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  // Como no protótipo: a documentação abre só com as unidades ativas.
  const [status, setStatus] = useState("active");
  const [situation, setSituation] = useState<DocSituation>("");
  const [cat, setCat] = useState<CategoryFilter>("overview");
  const [drawer, setDrawer] = useState<{ unit: Unit; cell: DocCell } | null>(null);

  const byId = new Map(allRows.map((r) => [r.unit.id, r]));
  const cities = unique(units.map((u) => u.address.city));
  const rows = units
    .filter((u) => !name || norm(u.name).includes(norm(name)) || (digits(name) !== "" && u.cnes.includes(digits(name))))
    .filter((u) => !city || u.address.city === city)
    .filter((u) => matchesStatus(u, status))
    .filter((u) => !situation || matchesSituation(byId.get(u.id)!, situation))
    .sort(byActive)
    .map((u) => byId.get(u.id)!);

  const overview = cat === "overview";
  const slots = overview ? [] : slotsOf(cat);
  const colCount = 1 + (overview ? 1 + DOC_GROUPS.length : slots.length);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] items-end gap-3">
        <SearchFilter id="docs_name" label="Nome/CNES" placeholder="Buscar por nome ou CNES" value={name} onChange={setName} />
        <SelectFilter id="docs_city" label="Cidade" prompt="Todas" options={pairs(cities)} value={city} onChange={setCity} />
        <SelectFilter id="docs_status" label="Status" prompt="Todos" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        <SelectFilter id="docs_situation" label="Situação da documentação" prompt="Todas" options={SITUATIONS} value={situation} onChange={(v) => setSituation(v as DocSituation)} />
        <SelectFilter
          id="docs_category"
          label="Categoria"
          options={[["Visão geral", "overview"], ...DOC_GROUPS.map((g) => [g.label, g.id] as const)]}
          value={cat}
          onChange={(v) => setCat((v || "overview") as CategoryFilter)}
        />
      </div>

      {!overview && (
        <div className="mt-4 flex items-center gap-2">
          <Button type="button" variant="ghost" size="medium" leftIcon="fa-arrow-left" onClick={() => setCat("overview")}>
            Voltar para visão geral
          </Button>
          <span className="text-brand-purple-dark/30">/</span>
          <span className="text-sm font-bold text-brand-purple-dark">{DOC_GROUPS.find((g) => g.id === cat)?.label}</span>
        </div>
      )}

      <SimpleTable className={cx("mt-4", ROWS, "[&_th]:text-center! [&_td]:text-center! [&_th:first-child]:text-left! [&_td:first-child]:text-left!")}>
        <thead>
          <tr>
            <th>Nome</th>
            {overview && <th className="text-left!">Completude</th>}
            {overview &&
              DOC_GROUPS.map((g) => (
                <th key={g.id}>
                  <button
                    type="button"
                    title={`Ver ${g.label} em detalhe`}
                    onClick={() => setCat(g.id)}
                    className="inline-flex cursor-pointer items-center gap-1.5 font-bold hover:text-brand-blue-dark"
                  >
                    {g.label}
                    <Icon name="fa-chevron-right" type="solid" className="text-[10px]" />
                  </button>
                </th>
              ))}
            {slots.map((s) => (
              <th key={s.id} title={`${s.name} · renovação ${s.renewal}`}>
                <span className="mx-auto line-clamp-2 max-w-[120px] min-w-[80px] leading-tight whitespace-normal">
                  {s.short}
                  {s.group === "ess" ? " *" : ""}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody id="units-docs">
          {rows.map((r) => (
            <UnitRow key={r.unit.id} unit={r.unit} onClick={() => openUnit(r.unit)}>
              {overview && (
                <td className="text-left!">
                  <Completeness pct={r.pct} />
                </td>
              )}
              {overview &&
                DOC_GROUPS.map((g) => (
                  <td key={g.id} onClick={stop}>
                    <Rollup id={`${r.unit.id}-${g.id}`} counts={r.groups[g.id].counts} total={r.groups[g.id].cells.length} onClick={() => setCat(g.id)} />
                  </td>
                ))}
              {!overview &&
                slots.map((s) => {
                  const c = r.groups[cat].cells.find((x) => x.slot.id === s.id)!;
                  return (
                    <td key={s.id} onClick={stop}>
                      <CellBox
                        state={c.state}
                        label={c.viaCli ? "CLI" : null}
                        title={`${s.name} — ${DOC_STATES[c.state].label}${c.viaCli ? " (via CLI)" : ""}${c.doc?.validUntil ? ` · até ${c.doc.validUntil}` : ""}`}
                        onClick={() => setDrawer({ unit: r.unit, cell: c })}
                      />
                    </td>
                  );
                })}
            </UnitRow>
          ))}
          <EmptyRow colSpan={colCount} show={rows.length === 0} />
        </tbody>
      </SimpleTable>

      <p className="mt-4 text-xs text-brand-purple-dark/50">
        {overview
          ? "Completude considera só os essenciais. Alvará pode ser substituído pelo CLI nos municípios com licenciamento integrado; CNES não tem validade."
          : "* essencial — conta na completude. Alvará pode ser substituído pelo CLI nos municípios com licenciamento integrado; CNES não tem validade."}
      </p>

      <DocDrawer unit={drawer?.unit ?? units[0]!} cell={drawer?.cell ?? null} onClose={() => setDrawer(null)} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

/** O `id` e o `tracker_id` do `button_tabs` das visões. */
const VIEW_TABS_ID = "units-view";
const VIEW_TRACKER = "view";
const VIEW_TITLES: Record<UnitsView, string> = { list: "Cadastro", docs: "Documentação" };

/**
 * Abre o `button_tabs` na visão do cenário: grava a aba na query antes de ele
 * montar, como o `tracker_id` faz no Phoenix. Sobrescreve a de outro cenário.
 */
function openView(view: UnitsView) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set(VIEW_TRACKER, `${VIEW_TABS_ID}|${titleToSlug(VIEW_TITLES[view])}`);
  window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
}

function UnitsCard({ fixture, canCreate }: { fixture: UnitsFixture; canCreate: boolean }) {
  // Roda antes do `ButtonTabs` montar e ler a query.
  useState(() => openView(fixture.view));
  const slug = useTrackedTab(VIEW_TRACKER, VIEW_TABS_ID);
  const view: UnitsView = slug === titleToSlug(VIEW_TITLES.docs) ? "docs" : "list";

  return (
    <Card>
      <div className="mb-4 flex flex-row flex-wrap items-center justify-between gap-2">
        <Header variant="large">Unidades</Header>
        <div className="flex flex-wrap items-center gap-3">
          {/* Só as abas, ao lado de Nova unidade: a visão aberta é desenhada embaixo, pelo `tracker_id`. */}
          <div className="[&_.content]:hidden">
            <ButtonTabs
              id={VIEW_TABS_ID}
              trackerId={VIEW_TRACKER}
              tab={[
                { title: VIEW_TITLES.list, content: null },
                { title: VIEW_TITLES.docs, content: null },
              ]}
            />
          </div>
          {canCreate && (
            <LinkButton navigate="/backoffice/unidades/novo" rightIcon="fa-plus" className="max-w-fit" onClick={(e) => e.preventDefault()}>
              Nova unidade
            </LinkButton>
          )}
        </div>
      </div>

      {view === "list" && <RegistryView units={fixture.units} />}
      {view === "docs" && <DocsView units={fixture.units} />}
    </Card>
  );
}

function UnitsScreen({ context }: { context: ScenarioContext }) {
  const fixture = fixtureOf(context);
  // `UnitPolicy.can?(role, :create)`: só admin.
  const canCreate = context.can("units.create");

  return (
    <DocsProvider initial={fixture.docs} units={fixture.units}>
      <BackofficeLayout context={context} currentPath={UNITS_PATH} breadcrumbs={[{ label: "Unidades" }]} currentUser={CURRENT_USER} currentUnit="Unidade Teste">
        <UnitsCard fixture={fixture} canCreate={canCreate} />
      </BackofficeLayout>
    </DocsProvider>
  );
}

export function Units({ context }: ScreenProps) {
  if (context.isLoading) return null;
  // A chave remonta a tela quando o cenário troca de fixture.
  return <UnitsScreen key={context.fixture?.id ?? "default"} context={context} />;
}
