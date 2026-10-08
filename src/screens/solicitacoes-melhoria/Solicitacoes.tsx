/**
 * Solicitações de melhoria — aba Solicitações: a base de SMs em lista
 * (`table/1`) ou no kanban do fluxo, com os filtros de unidade, etapa e
 * prioridade.
 *
 * O kanban é novo: não existe no Phoenix. Uma coluna por etapa, cartões
 * ordenados por prioridade e score, sem arrastar (a etapa só anda pelo
 * detalhe). Desenhado como o funil do CRM de Leads.
 */
import { Button } from "../../components/Button.js";
import { RadioSelector } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Table } from "../../components/Table.js";
import { L, ORDER, PRIO, STATUS, TONE_CLASS, fmt, opts, prioOf, prioRank, scoreOf, type Sm, type StatusId } from "./model.js";
import { PrioTag, StageTag, cx } from "./parts.js";

export type Filters = { q: string; unit: string; status: string; prio: string };
export const EMPTY_FILTERS: Filters = { q: "", unit: "", status: "", prio: "" };
export type View = "lista" | "kanban";

const STATUS_OPTIONS = ([...ORDER, "rejeitada", "cancelada"] as StatusId[]).map((id) => [STATUS[id].label, id] as const);
const PRIO_OPTIONS = (Object.keys(PRIO) as (keyof typeof PRIO)[]).map((id) => [PRIO[id].full, id] as const);

const createdKey = (s: Sm) => s.createdAt.slice(6, 10) + s.createdAt.slice(3, 5) + s.createdAt.slice(0, 2) + s.createdAt.slice(11);

export function applyFilters(sms: Sm[], f: Filters): Sm[] {
  const q = f.q.trim().toLowerCase();
  return sms
    .filter((s) => !f.unit || s.unit === f.unit)
    .filter((s) => !f.status || s.status === f.status)
    .filter((s) => !f.prio || prioOf(s) === f.prio)
    .filter((s) => !q || [s.id, s.title, s.requester].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) => (createdKey(b) > createdKey(a) ? 1 : -1));
}

export function Solicitacoes({
  sms,
  all,
  view,
  onView,
  filters,
  onFilters,
  onOpen,
}: {
  /** As SMs que a pessoa vê (o solicitante vê só as dele). */
  sms: Sm[];
  /** Todas, para o kanban contar as recusadas. */
  all: Sm[];
  view: View;
  onView: (view: View) => void;
  filters: Filters;
  onFilters: (f: Filters) => void;
  onOpen: (s: Sm) => void;
}) {
  const rows = applyFilters(sms, filters);
  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch });
  const rejected = all.filter((s) => s.status === "rejeitada").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <p className="text-brand-purple-dark/80">{rows.length} solicitações</p>
        <div className="flex items-center gap-3">
          {view === "kanban" && rejected > 0 && (
            <Button type="button" variant="tint" color="red" size="medium" leftIcon="fa-ban" onClick={() => { onView("lista"); set({ status: "rejeitada" }); }}>
              Ver recusadas ({rejected})
            </Button>
          )}
          <RadioSelector
            field={{ id: "sm_view", name: "sm_view", value: view }}
            radio={[
              { value: "lista", icon: "fa-table-list", title: "Lista" },
              { value: "kanban", icon: "fa-table-columns", title: "Kanban" },
            ]}
            onChange={(e) => onView(e.target.value as View)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Input id="sm_filter_q" label="Buscar" leftIcon="fa-magnifying-glass" placeholder="Buscar por código, título ou solicitante" value={filters.q} onChange={(e) => set({ q: e.target.value })} />
        <Input type="select" id="sm_filter_unit" label="Unidade" prompt="Todas as unidades" options={opts(L.units)} value={filters.unit} onChange={(v) => set({ unit: v ?? "" })} />
        <Input type="select" id="sm_filter_status" label="Etapa" prompt="Todas as etapas" options={STATUS_OPTIONS} value={filters.status} onChange={(v) => set({ status: v ?? "" })} />
        <Input type="select" id="sm_filter_prio" label="Prioridade" prompt="Todas as prioridades" options={PRIO_OPTIONS} value={filters.prio} onChange={(v) => set({ prio: v ?? "" })} />
      </div>

      {view === "lista" ? (
        <Table
          id="sm_list"
          rows={rows}
          rowId={(s) => s.id}
          rowClick={onOpen}
          emptyMessage="Nenhuma solicitação encontrada"
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
            { label: "Score", render: (s) => <span className="tabular-nums font-bold">{fmt(scoreOf(s))}</span> },
            { label: "Prioridade", render: (s) => <PrioTag sm={s} /> },
            { label: "Etapa", render: (s) => <StageTag status={s.status} /> },
          ]}
        />
      ) : (
        <Board sms={rows} onOpen={onOpen} />
      )}
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
        <span><Icon name="fa-thumbs-up" type="solid" /> {s.votes}</span>
      </div>
    </article>
  );
}
