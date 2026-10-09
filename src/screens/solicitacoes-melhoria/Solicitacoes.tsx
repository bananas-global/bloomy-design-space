/**
 * Solicitações de melhoria — aba Solicitações: a base de SMs em cards, em lista
 * (`table/1`) ou no kanban do fluxo, com os filtros de unidade, etapa e
 * prioridade e a ordem por data ou por pessoas afetadas. O colaborador vê todas
 * as SMs, nas mesmas três visualizações (o kanban só para olhar: a etapa anda
 * pelo detalhe).
 *
 * O kanban é novo: não existe no Phoenix. Uma coluna por etapa, cartões
 * ordenados por prioridade e score, sem arrastar (a etapa só anda pelo
 * detalhe). Desenhado como o funil do CRM de Leads.
 */
import { Button } from "../../components/Button.js";
import { RadioSelector } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Header } from "../../components/Layout.js";
import { Table } from "../../components/Table.js";
import { Tag } from "../../components/Tag.js";
import { L, ORDER, PRIO, STATUS, TAG_OF, TONE_CLASS, fmt, isClosed, opts, prioOf, prioRank, scoreOf, type Role, type Sm, type StatusId } from "./model.js";
import { Cards } from "./Cards.js";
import { PrioTag, StageTag, cx } from "./parts.js";

export type Sort = "recentes" | "afetados";
export type Filters = { q: string; unit: string; status: string; prio: string; sort: Sort };
export const EMPTY_FILTERS: Filters = { q: "", unit: "", status: "", prio: "", sort: "recentes" };
export type View = "cards" | "lista" | "kanban";

const VIEW_OPTIONS: Record<View, { icon: string; title: string }> = {
  cards: { icon: "fa-grid-2", title: "Cards" },
  lista: { icon: "fa-table-list", title: "Lista" },
  kanban: { icon: "fa-table-columns", title: "Kanban" },
};

const STATUS_OPTIONS = ([...ORDER, "rejeitada", "cancelada", "excluida"] as StatusId[]).map((id) => [STATUS[id].label, id] as const);
const PRIO_OPTIONS = (Object.keys(PRIO) as (keyof typeof PRIO)[]).map((id) => [PRIO[id].full, id] as const);

const createdKey = (s: Sm) => s.createdAt.slice(6, 10) + s.createdAt.slice(3, 5) + s.createdAt.slice(0, 2) + s.createdAt.slice(11);

export function applyFilters(sms: Sm[], f: Filters): Sm[] {
  const q = f.q.trim().toLowerCase();
  return sms
    .filter((s) => !f.unit || s.unit === f.unit)
    .filter((s) => !f.status || s.status === f.status)
    .filter((s) => !f.prio || prioOf(s) === f.prio)
    .filter((s) => !q || [s.id, s.title, s.requester].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) =>
      f.sort === "afetados"
        ? Number(isClosed(a)) - Number(isClosed(b)) || b.affected.length - a.affected.length
        : createdKey(b) > createdKey(a) ? 1 : -1,
    );
}

export function Solicitacoes({
  sms,
  all,
  role,
  view,
  views,
  onView,
  filters,
  onFilters,
  onOpen,
  title = true,
}: {
  /** As SMs que a pessoa vê. */
  sms: Sm[];
  /** Todas, para o kanban contar as recusadas. */
  all: Sm[];
  role: Role;
  view: View;
  /** As visualizações que o papel tem; com uma só, o seletor some. */
  views: View[];
  onView: (view: View) => void;
  /** O título "Solicitações": a gestão mostra; o colaborador já tem o da página no mesmo card. */
  title?: boolean;
  filters: Filters;
  onFilters: (f: Filters) => void;
  onOpen: (s: Sm) => void;
}) {
  const rows = applyFilters(sms, filters);
  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch });
  const filtered = !!(filters.q.trim() || filters.unit || filters.status || filters.prio);
  // Com filtro, o problema é o filtro; sem, a base ainda está vazia.
  const empty = filtered
    ? "Nenhuma solicitação com esses filtros"
    : "Nenhuma solicitação ainda. Use Nova solicitação para registrar uma dor da sua rotina.";
  const rejected = all.filter((s) => s.status === "rejeitada").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>{title && <Header variant="small">Solicitações</Header>}</div>
        <div className="flex items-center gap-3">
          {view === "kanban" && rejected > 0 && (
            <Button type="button" variant="tint" color="red" size="medium" leftIcon="fa-ban" onClick={() => { onView("lista"); set({ status: "rejeitada" }); }}>
              Ver rejeitadas ({rejected})
            </Button>
          )}
          {views.length > 1 && (
            <RadioSelector
              field={{ id: "sm_view", name: "sm_view", value: view }}
              radio={views.map((v) => ({ value: v, ...VIEW_OPTIONS[v] }))}
              onChange={(e) => onView(e.target.value as View)}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Input id="sm_filter_q" label="Buscar" leftIcon="fa-magnifying-glass" placeholder="Código, título ou solicitante" value={filters.q} onChange={(e) => set({ q: e.target.value })} />
        <Input type="select" id="sm_filter_unit" label="Unidade" prompt="Todas as unidades" options={opts(L.units)} value={filters.unit} onChange={(v) => set({ unit: v ?? "" })} />
        <Input type="select" id="sm_filter_status" label="Etapa" prompt="Todas as etapas" options={STATUS_OPTIONS} value={filters.status} onChange={(v) => set({ status: v ?? "" })} />
        <Input type="select" id="sm_filter_prio" label="Prioridade" prompt="Todas as prioridades" options={PRIO_OPTIONS} value={filters.prio} onChange={(v) => set({ prio: v ?? "" })} />
        <Input
          type="select"
          id="sm_filter_sort"
          label="Ordenar por"
          options={[["Mais recentes", "recentes"], ["Mais pessoas afetadas", "afetados"]]}
          value={filters.sort}
          clear={false}
          onChange={(v) => set({ sort: (v as Sort) || "recentes" })}
        />
      </div>

      {view === "cards" && <Cards sms={rows} role={role} emptyText={empty} onOpen={onOpen} />}
      {view === "lista" && (
        <Table
          id="sm_list"
          rows={rows}
          rowId={(s) => s.id}
          rowClick={onOpen}
          emptyMessage={empty}
          col={[
            { label: "Código", render: (s) => <span className="tabular-nums font-bold">{s.id}</span> },
            {
              label: "Solicitação",
              render: (s) => (
                <div>
                  <p className="font-bold text-brand-purple-dark">{s.title}</p>
                  <p className="text-sm">{s.requester} · {s.area}</p>
                </div>
              ),
            },
            { label: "Unidade", render: (s) => s.unit },
            { label: "Aberta em", render: (s) => s.createdAt.slice(0, 10) },
            { label: "Afetados", render: (s) => <span className="tabular-nums font-bold"><Icon name="fa-users" type="solid" className="mr-1.5 text-brand-purple-dark/40" />{s.affected.length}</span> },
            { label: "Score", render: (s) => <span className="tabular-nums font-bold">{fmt(scoreOf(s))}</span> },
            { label: "Prioridade", render: (s) => <PrioTag sm={s} /> },
            { label: "Etapa", render: (s) => <StageTag status={s.status} /> },
          ]}
        />
      )}
      {view === "kanban" && <Board sms={rows} onOpen={onOpen} />}

      {view !== "cards" && <PrioLegend />}
    </div>
  );
}

/** A legenda das prioridades, abaixo da lista e do kanban. */
function PrioLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-brand-purple-dark/70">
      <span className="font-bold">Prioridade</span>
      {(Object.keys(PRIO) as (keyof typeof PRIO)[]).map((id) => (
        <span key={id} className="inline-flex items-center gap-1.5">
          <Tag item={id} variant={TAG_OF[PRIO[id].tone]} />
          {PRIO[id].full.split("– ")[1]}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <Tag item="A definir" variant="dark-purple" />
        ainda sem notas do PMO
      </span>
    </div>
  );
}

function Board({ sms, onOpen }: { sms: Sm[]; onOpen: (s: Sm) => void }) {
  return (
    <div className="-mx-6 flex items-start gap-3.5 overflow-x-auto px-6 pb-2.5 thin-scrollbar">
      {ORDER.map((k) => {
        const st = STATUS[k];
        const items = sms.filter((s) => s.status === k).sort((a, b) => prioRank(a) - prioRank(b) || (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1));
        return (
          <section key={k} aria-label={st.label} className="flex min-h-44 w-64 flex-none flex-col gap-2.5 rounded-2xl bg-brand-purple-dark/5 p-3">
            <header className="space-y-1 px-1">
              <div className="flex items-center gap-2">
                <span className={cx("inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg text-xs", TONE_CLASS[st.tone])}>
                  <Icon name={st.icon} type="solid" />
                </span>
                <h3 className="flex-1 truncate text-sm font-extrabold text-brand-purple-dark">{st.label}</h3>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-extrabold text-brand-purple-dark/70">{items.length}</span>
              </div>
              <p className="text-xs font-semibold text-brand-purple-dark/50">{st.owner}</p>
            </header>
            {items.map((s) => (
              <SmCard key={s.id} sm={s} onClick={() => onOpen(s)} />
            ))}
            {items.length === 0 && <p className="py-4 text-center text-sm text-brand-purple-dark/40">Sem solicitações</p>}
          </section>
        );
      })}
    </div>
  );
}

function SmCard({ sm: s, onClick }: { sm: Sm; onClick: () => void }) {
  const sc = scoreOf(s);
  return (
    <article onClick={onClick} className="cursor-pointer space-y-2 rounded-xl bg-white p-3 shadow-main transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="tabular-nums text-sm font-bold text-brand-purple-dark/60">{s.id}</span>
        <PrioTag sm={s} />
      </div>
      <p className="font-bold leading-snug text-brand-purple-dark">{s.title}</p>
      <p className="text-sm text-brand-purple-dark/60">{s.unit} · {s.area}</p>
      <div className="flex items-center justify-between border-t border-brand-purple-dark/10 pt-2 text-xs font-bold text-brand-purple-dark/60">
        <span>{sc != null ? `${fmt(sc)} pts${s.effort ? ` · ${s.effort}` : ""}` : s.createdAt.slice(0, 10)}</span>
        <span title="Pessoas afetadas"><Icon name="fa-users" type="solid" /> {s.affected.length}</span>
      </div>
    </article>
  );
}
