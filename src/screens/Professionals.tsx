/**
 * Profissionais — a lista do backoffice com três visões no mesmo card.
 *
 * No monólito, `ProfessionalLive.Index` é a lista (Cadastro) e o Controle de
 * horas é outra página (`ProfessionalLive.HoursControl`), aberta por um
 * `link_button`. Aqui as duas ficam atrás de um seletor, com uma terceira
 * visão nova, Documentação: a matriz de documentos da equipe (cadastro,
 * internos, ocupacionais) e o credenciamento em cada operadora.
 *
 * Novo — não existe no Phoenix: o seletor de visão (com ícone e contador),
 * a visão Documentação e os seus drawers.
 */
import { useMemo, useState } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { LinkButton, showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Icon } from "../components/Icon.js";
import { Input } from "../components/Input.js";
import { Header } from "../components/Layout.js";
import { SimpleTable } from "../components/Table.js";
import { Tag, TagList } from "../components/Tag.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { DocDrawer, OpDrawer } from "./profissionais/drawers.js";
import { MONTH_HOURS, OPERATORS, PROFESSIONALS_FIXTURES, TODAY, type ProfessionalsFixture, type ProfessionalsView } from "./profissionais/fixtures.js";
import {
  byStatus,
  DOC_CATEGORIES,
  DOC_STATES,
  matchesSituation,
  norm,
  profStatus,
  typesOf,
  type CategoryFilter,
  type DocCell,
  type DocRow,
  type DocSituation,
  type OpCell,
  type ProfDoc,
  type Professional,
} from "./profissionais/model.js";
import { CellBox, Completeness, NameCell, Rollup, SearchFilter, SelectFilter, ViewToggle } from "./profissionais/parts.js";
import { DocsProvider, useDocs } from "./profissionais/store.js";

export const PROFESSIONALS_PATH = "/backoffice/profissionais";

const CURRENT_USER = {
  name: "Marcus Vinícius Gimenes",
  units: ["Unidade Teste", "Santana"],
  roles: [],
  professional: false,
};

const fixtureOf = (context: ScenarioContext): ProfessionalsFixture => {
  const data = context.data as ProfessionalsFixture | undefined;
  if (data) return data;
  const first = PROFESSIONALS_FIXTURES[0]!.data;
  return typeof first === "function" ? first() : first;
};

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const unique = (values: string[]) => [...new Set(values)];
const pairs = (values: string[]) => values.map((v) => [v, v] as const);

/** Linhas de 60px, como no desenho. */
const ROWS = "[&_tbody_tr_td]:h-[60px] [&_tbody_tr_td]:py-1.5!";

const openProfile = (p: Professional) =>
  showToast({ type: "info", title: "Perfil do profissional", content: `O perfil de ${p.name} não faz parte deste protótipo.`, closeTime: 4000 });

/* ------------------------------------------------------------------ */
/* Cadastro                                                            */
/* ------------------------------------------------------------------ */

function RegistryView({ professionals }: { professionals: Professional[] }) {
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [perfil, setPerfil] = useState("");
  const [status, setStatus] = useState("");

  const specialties = unique(professionals.map((p) => p.specialty));
  const perfis = unique(professionals.flatMap((p) => p.types));
  const rows = professionals
    .filter((p) => !name || norm(p.name).includes(norm(name)) || norm(p.council).includes(norm(name)))
    .filter((p) => !specialty || p.specialty === specialty)
    .filter((p) => !perfil || p.types.includes(perfil))
    .filter((p) => !status || (status === "ativo" ? profStatus(p, TODAY) !== "inativo" : profStatus(p, TODAY) === "inativo"))
    .sort(byStatus(TODAY));

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] items-end gap-4">
        <SearchFilter id="filters_name" label="Nome/Conselho" placeholder="Buscar por nome ou conselho" value={name} onChange={setName} />
        <SelectFilter id="filters_specialty" label="Especialidade" prompt="Todas" options={pairs(specialties)} value={specialty} onChange={setSpecialty} />
        <SelectFilter id="filters_professional_types" label="Perfil" prompt="Todos" options={pairs(perfis)} value={perfil} onChange={setPerfil} />
        <SelectFilter
          id="filters_status"
          label="Status"
          prompt="Todos"
          options={[
            ["Ativo", "ativo"],
            ["Inativo", "inativo"],
          ]}
          value={status}
          onChange={setStatus}
        />
      </div>

      <SimpleTable className={cx("mt-4", ROWS)}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Especialidade</th>
            <th>Conselho</th>
            <th>Perfil</th>
            <th>Formação em Saúde</th>
          </tr>
        </thead>
        <tbody id="professionals">
          {rows.map((p) => (
              <ProfRow key={p.id} prof={p} onClick={() => openProfile(p)}>
                <td>
                  <Tag item={p.specialty} className="whitespace-nowrap" />
                </td>
                <td>{p.council}</td>
                <td>
                  <TagList items={p.types} limit={2} />
                </td>
                <td>
                  <Tag item={p.formation} className="whitespace-nowrap" />
                </td>
              </ProfRow>
          ))}
          <EmptyRow colSpan={5} show={rows.length === 0} />
        </tbody>
      </SimpleTable>
    </>
  );
}

/** A linha de um profissional: o nome com o status e, em inativação, o fundo laranja. */
function ProfRow({ prof, onClick, children }: { prof: Professional; onClick?: () => void; children: React.ReactNode }) {
  const st = profStatus(prof, TODAY);
  const leaving = st === "deactivating";
  return (
    <tr id={prof.id} onClick={onClick} className={cx(onClick && "cursor-pointer", leaving && "[&>td]:bg-orange/4")}>
      <td className={cx(leaving && "shadow-[inset_3px_0_0_var(--color-orange)]")}>
        <NameCell prof={prof} status={st} today={TODAY} />
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
  ["Ausentes", "ausente"],
  ["A vencer", "a_vencer"],
  ["Dispensados", "dispensado"],
  ["Em dia", "em_dia"],
];

function DocsView({ professionals }: { professionals: Professional[] }) {
  const { rows: allRows, state } = useDocs();
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [status, setStatus] = useState("");
  const [situation, setSituation] = useState<DocSituation>("");
  const [cat, setCat] = useState<CategoryFilter>("overview");
  const [docDrawer, setDocDrawer] = useState<{ prof: Professional; cell: DocCell } | null>(null);
  const [opDrawer, setOpDrawer] = useState<{ prof: Professional; cell: OpCell } | null>(null);

  const byId = new Map(allRows.map((r) => [r.prof.id, r]));
  const specialties = unique(professionals.map((p) => p.specialty));
  const rows = professionals
    .filter((p) => !name || norm(p.name).includes(norm(name)) || norm(p.council).includes(norm(name)))
    .filter((p) => !specialty || p.specialty === specialty)
    .filter((p) => !status || profStatus(p, TODAY) === status)
    .filter((p) => !situation || matchesSituation(byId.get(p.id)!, situation))
    .sort(byStatus(TODAY))
    .map((p) => byId.get(p.id)!);

  const overview = cat === "overview";
  const types = cat === "overview" || cat === "ops" ? [] : typesOf(cat);
  const ops = cat === "ops" ? OPERATORS : [];
  const colCount = 1 + (overview ? 1 + DOC_CATEGORIES.length : 0) + ops.length + types.length;
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] items-end gap-3">
        <SearchFilter id="docs_name" label="Nome/Conselho" placeholder="Buscar por nome ou conselho" value={name} onChange={setName} />
        <SelectFilter id="docs_specialty" label="Especialidade" prompt="Todas" options={pairs(specialties)} value={specialty} onChange={setSpecialty} />
        <SelectFilter
          id="docs_status"
          label="Status"
          prompt="Todos"
          options={[
            ["Ativo", "ativo"],
            ["Em inativação", "deactivating"],
            ["Inativo", "inativo"],
          ]}
          value={status}
          onChange={setStatus}
        />
        <SelectFilter id="docs_situation" label="Situação da documentação" prompt="Todas" options={SITUATIONS} value={situation} onChange={(v) => setSituation(v as DocSituation)} />
        <SelectFilter
          id="docs_category"
          label="Categoria"
          options={[["Visão geral", "overview"], ...DOC_CATEGORIES.map((c) => [c.label, c.id] as const)]}
          value={cat}
          onChange={(v) => setCat((v || "overview") as CategoryFilter)}
        />
      </div>

      {!overview && (
        <div className="mt-4 flex items-center gap-2">
          {/* Como o "Voltar para profissionais" do Controle de horas: `button` ghost com a seta. */}
          <Button type="button" variant="ghost" size="medium" leftIcon="fa-arrow-left" onClick={() => setCat("overview")}>
            Voltar para visão geral
          </Button>
          <span className="text-brand-purple-dark/30">/</span>
          <span className="text-sm font-bold text-brand-purple-dark">{DOC_CATEGORIES.find((c) => c.id === cat)?.label}</span>
        </div>
      )}

      <SimpleTable className={cx("mt-4", ROWS, "[&_th]:text-center! [&_td]:text-center! [&_th:first-child]:text-left! [&_td:first-child]:text-left!")}>
        <thead>
          <tr>
            <th>Nome</th>
            {overview && <th className="text-left!">Completude</th>}
            {overview &&
              DOC_CATEGORIES.map((c) => (
                <th key={c.id}>
                  <button
                    type="button"
                    title={`Ver ${c.label} em detalhe`}
                    onClick={() => setCat(c.id)}
                    className="inline-flex cursor-pointer items-center gap-1.5 font-bold hover:text-brand-blue-dark"
                  >
                    {c.label}
                    <Icon name="fa-chevron-right" type="solid" className="text-[10px]" />
                  </button>
                </th>
              ))}
            {ops.map((o) => (
              <RotHead key={o.id} title={o.name}>
                {o.name}
              </RotHead>
            ))}
            {types.map((t) => (
              <RotHead key={t.id} title={t.name}>
                {t.short}
                {t.required ? " *" : ""}
                {t.id === "aba_course" ? " (h)" : ""}
              </RotHead>
            ))}
          </tr>
        </thead>
        <tbody id="professionals-docs">
          {rows.map((r) => (
            <ProfRow key={r.prof.id} prof={r.prof} onClick={() => openProfile(r.prof)}>
              {overview && (
                <td className="text-left!">
                  <Completeness pct={r.pct} />
                </td>
              )}
              {overview &&
                DOC_CATEGORIES.map((c) => (
                  <td key={c.id} onClick={stop}>
                    {c.id === "ops" ? (
                      <Rollup
                        id={`${r.prof.id}-ops`}
                        counts={countOps(r)}
                        total={r.ops.length}
                        onClick={() => setCat("ops")}
                      />
                    ) : (
                      <Rollup id={`${r.prof.id}-${c.id}`} counts={r.cats[c.id].counts} total={r.cats[c.id].cells.length} onClick={() => setCat(c.id)} />
                    )}
                  </td>
                ))}
              {ops.map((op) => {
                const o = r.ops.find((x) => x.op.id === op.id)!;
                return (
                  <td key={op.id} onClick={stop}>
                    <CellBox
                      state={o.state}
                      label={o.state === "expiring" && o.missing.length ? String(o.missing.length) : null}
                      title={`${op.name} — ${o.label}`}
                      onClick={() => setOpDrawer({ prof: r.prof, cell: o })}
                    />
                  </td>
                );
              })}
              {cat !== "overview" &&
                cat !== "ops" &&
                types.map((t) => {
                  const c = r.cats[cat].cells.find((x) => x.type.id === t.id)!;
                  const hours = t.id === "aba_course" ? abaHours(state.docs[r.prof.id]) : null;
                  return (
                    <td key={t.id} onClick={stop}>
                      <CellBox
                        state={c.state}
                        label={hours ? `${hours}h` : null}
                        title={`${t.name} — ${DOC_STATES[c.state].label}`}
                        onClick={() => setDocDrawer({ prof: r.prof, cell: c })}
                      />
                    </td>
                  );
                })}
            </ProfRow>
          ))}
          <EmptyRow colSpan={colCount} show={rows.length === 0} />
        </tbody>
      </SimpleTable>

      {cat !== "overview" && cat !== "ops" && <p className="mt-4 text-xs text-brand-purple-dark/50">* documento obrigatório — conta na completude. Dispensados saem do cálculo.</p>}

      <DocDrawer prof={docDrawer?.prof ?? professionals[0]!} cell={docDrawer?.cell ?? null} onClose={() => setDocDrawer(null)} />
      <OpDrawer prof={opDrawer?.prof ?? professionals[0]!} cell={opDrawer?.cell ?? null} onClose={() => setOpDrawer(null)} />
    </>
  );
}

function countOps(r: DocRow) {
  const counts = { ok: 0, expiring: 0, expired: 0, missing: 0, waived: 0 };
  for (const o of r.ops) counts[o.state]++;
  return counts;
}

/** A carga horária ABA: a soma dos certificados de curso ABA do cadastro. */
function abaHours(docs: ProfDoc[] | undefined): number {
  return (docs ?? []).filter((d) => d.typeId === "aba_course").reduce((sum, d) => sum + (d.hours ?? 0), 0);
}

/** Cabeçalho de coluna estreita: até duas linhas, com o nome inteiro no `title`. */
function RotHead({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <th title={title}>
      <span className="mx-auto line-clamp-2 max-w-[120px] leading-tight whitespace-normal">{children}</span>
    </th>
  );
}

/* ------------------------------------------------------------------ */
/* Controle de horas                                                   */
/* ------------------------------------------------------------------ */

function HoursView({ professionals, initialProcessed }: { professionals: Professional[]; initialProcessed?: string[] }) {
  const specialties = unique(professionals.map((p) => p.specialty));
  const initialSpecialty = initialProcessed?.length ? professionals.find((p) => p.id === initialProcessed[0])!.specialty : "";
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [profIds, setProfIds] = useState<string[]>(initialProcessed ?? []);
  const [month, setMonth] = useState(TODAY.slice(0, 7));
  const [processed, setProcessed] = useState<string[] | null>(initialProcessed ?? null);

  const options = professionals.filter((p) => p.active && (!specialty || p.specialty === specialty));

  function changeSpecialty(v: string) {
    setSpecialty(v);
    // Como no `handle_callback_loads`: a especialidade seleciona os profissionais dela.
    setProfIds(v ? professionals.filter((p) => p.active && p.specialty === v).map((p) => p.id) : []);
  }

  const rows = processed ? professionals.filter((p) => processed.includes(p.id)) : [];

  return (
    <>
      <div className="flex w-full items-end gap-4">
        <div className="min-w-0 flex-1">
          <SelectFilter id="hours_control_specialty" label="Especialidade" prompt="Selecione a especialidade" options={pairs(specialties)} value={specialty} onChange={changeSpecialty} />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            key={specialty}
            type="multi_select_search"
            id="hours_control_professional_ids"
            name="hours_control[professional_ids]"
            label="Profissionais"
            prompt="Selecione os profissionais"
            options={options.map((p) => ({ label: p.name, value: p.id }))}
            value={profIds}
            onChange={setProfIds}
          />
        </div>
        <div className="min-w-0 flex-1">
          <Input type="month" id="hours_control_month" name="hours_control[month]" label="Mês" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <Button type="button" variant="tint" rightIcon="fa-check" className="flex-none" onClick={() => setProcessed([...profIds])}>
          Processar
        </Button>
      </div>

      <SimpleTable className={cx("mt-4", ROWS)}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Horas planejadas</th>
            <th>Horas trabalhadas</th>
            <th>Atendimentos</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody id="hours-summary">
          {rows.map((p) => {
            const h = MONTH_HOURS[p.id] ?? { planned: 0, worked: 0, appointments: 0, compensation: "R$ 0,00" };
            return (
              <ProfRow key={p.id} prof={p}>
                <td>{h.planned}h</td>
                <td>{h.worked}h</td>
                <td>{h.appointments}</td>
                <td>{h.compensation}</td>
              </ProfRow>
            );
          })}
          <EmptyRow colSpan={5} show={rows.length === 0}>
            Selecione profissionais e o mês, depois clique em Processar.
          </EmptyRow>
        </tbody>
      </SimpleTable>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

function ProfessionalsCard({ fixture, canCreate }: { fixture: ProfessionalsFixture; canCreate: boolean }) {
  const { rows } = useDocs();
  const [view, setView] = useState<ProfessionalsView>(fixture.view);
  // Quantos profissionais têm documento vencido ou obrigatório ausente.
  const pending = useMemo(() => rows.filter((r) => r.expired.length || r.missing.length).length, [rows]);

  return (
    <Card>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Header variant="large">Profissionais</Header>
        <div className="flex items-center gap-3">
          <ViewToggle
            value={view}
            onChange={setView}
            options={[
              { id: "list", label: "Cadastro", icon: "fa-users" },
              { id: "docs", label: "Documentação", icon: "fa-folder-open", badge: pending },
              { id: "hours", label: "Controle de horas", icon: "fa-clock" },
            ]}
          />
          {canCreate && (
            <LinkButton navigate="/backoffice/profissionais/novo" rightIcon="fa-plus" className="max-w-fit" onClick={(e) => e.preventDefault()}>
              Novo profissional
            </LinkButton>
          )}
        </div>
      </div>

      {view === "list" && <RegistryView professionals={fixture.professionals} />}
      {view === "docs" && <DocsView professionals={fixture.professionals} />}
      {view === "hours" && <HoursView professionals={fixture.professionals} initialProcessed={fixture.processed} />}
    </Card>
  );
}

function ProfessionalsScreen({ context }: { context: ScenarioContext }) {
  const fixture = fixtureOf(context);
  // `ProfessionalPolicy.can?(role, :create)`: admin, clinic_admin, coordinator e people.
  const canCreate = context.can("professionals.create");

  return (
    <DocsProvider initial={fixture.docs} professionals={fixture.professionals}>
      <BackofficeLayout context={context} currentPath={PROFESSIONALS_PATH} breadcrumbs={[{ label: "Profissionais" }]} currentUser={CURRENT_USER} currentUnit="Unidade Teste">
        <ProfessionalsCard fixture={fixture} canCreate={canCreate} />
      </BackofficeLayout>
    </DocsProvider>
  );
}

export function Professionals({ context }: ScreenProps) {
  if (context.isLoading) return null;
  // A chave remonta a tela quando o cenário troca de fixture.
  return <ProfessionalsScreen key={context.fixture?.id ?? "default"} context={context} />;
}
