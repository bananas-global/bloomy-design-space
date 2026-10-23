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
import { RadioSelector } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Header } from "../../components/Layout.js";
import { Table } from "../../components/Table.js";
import { Tag } from "../../components/Tag.js";
import { L, ORDER, PRIO, SLA_DAYS, STATUS, TAG_OF, affectsMe, daysInStage, fmt, isClosed, isMine, opts, overdueActions, prioOf, prioRank, scoreOf, type Role, type Sm, type StatusId, type Tone } from "./model.js";
import { AffectButton, canAffect } from "./Afetados.js";
import { Cards, Outcome } from "./Cards.js";
import { PrioTag, StageTag, cx } from "./parts.js";

/** "Mostrar": duas ordens e, para o colaborador, dois recortes (as dele e as que o afetam, das mais recentes). */
export type Sort = "recentes" | "afetados" | "minhas" | "afetam";
export type Filters = { q: string; unit: string; status: string; prio: string; sort: Sort };
export const EMPTY_FILTERS: Filters = { q: "", unit: "", status: "", prio: "", sort: "recentes" };
export type View = "cards" | "lista" | "kanban";

const VIEW_OPTIONS: Record<View, { icon: string; title: string }> = {
  cards: { icon: "fa-grid-2", title: "Cards" },
  lista: { icon: "fa-table-list", title: "Lista" },
  kanban: { icon: "fa-table-columns", title: "Kanban" },
};

const STATUS_OPTIONS = ([...ORDER, "rejeitada", "cancelada", "descontinuada", "excluida"] as StatusId[]).map((id) => [STATUS[id].label, id] as const);
const PRIO_OPTIONS = (Object.keys(PRIO) as (keyof typeof PRIO)[]).map((id) => [PRIO[id].full, id] as const);

const createdKey = (s: Sm) => s.createdAt.slice(6, 10) + s.createdAt.slice(3, 5) + s.createdAt.slice(0, 2) + s.createdAt.slice(11);

/** O seletor de visualização. O colaborador o tem no cabeçalho da página, ao lado de Nova solicitação. */
export function ViewSelector({ view, views, onView }: { view: View; views: View[]; onView: (view: View) => void }) {
  return (
    <RadioSelector
      field={{ id: "sm_view", name: "sm_view", value: view }}
      radio={views.map((v) => ({ value: v, ...VIEW_OPTIONS[v] }))}
      onChange={(e) => onView(e.target.value as View)}
    />
  );
}

export function applyFilters(sms: Sm[], f: Filters, role: Role): Sm[] {
  const q = f.q.trim().toLowerCase();
  return sms
    .filter((s) => (f.sort === "minhas" ? isMine(s, role) : f.sort === "afetam" ? affectsMe(s, role) : true))
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
  role,
  view,
  views,
  onView,
  filters,
  onFilters,
  onOpen,
  title = true,
  viewSelector = true,
}: {
  /** As SMs que a pessoa vê. */
  sms: Sm[];
  role: Role;
  view: View;
  /** As visualizações que o papel tem; com uma só, o seletor some. */
  views: View[];
  onView: (view: View) => void;
  /** O título "Solicitações": a gestão mostra; o colaborador já tem o da página no mesmo card. */
  title?: boolean;
  /** O seletor de visualização aqui; o colaborador o tem no cabeçalho da página. */
  viewSelector?: boolean;
  filters: Filters;
  onFilters: (f: Filters) => void;
  onOpen: (s: Sm) => void;
}) {
  const rows = applyFilters(sms, filters, role);
  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch });
  const filtered = !!(filters.q.trim() || filters.unit || filters.status || filters.prio);
  // Com filtro, o problema é o filtro; nos recortes, cada um explica o seu; sem nada, a base está vazia.
  const empty = filtered
    ? "Nenhuma solicitação com esses filtros"
    : filters.sort === "minhas"
      ? "Você ainda não abriu nenhuma solicitação. Use Nova solicitação para registrar uma dor da sua rotina."
      : filters.sort === "afetam"
        ? "Você ainda não disse que alguma solicitação te afeta. Use Também me afeta nas que aparecem na sua rotina."
        : "Nenhuma solicitação ainda. Use Nova solicitação para registrar uma dor da sua rotina.";

  return (
    <div className="space-y-6">
      {(title || viewSelector) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>{title && <Header variant="small">Solicitações</Header>}</div>
          <div className="flex items-center gap-3">
            {viewSelector && views.length > 1 && <ViewSelector view={view} views={views} onView={onView} />}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Input id="sm_filter_q" label="Buscar" leftIcon="fa-magnifying-glass" placeholder="Código, título ou solicitante" value={filters.q} onChange={(e) => set({ q: e.target.value })} />
        <Input type="select" id="sm_filter_unit" label="Unidade" prompt="Todas as unidades" options={opts(L.units)} value={filters.unit} onChange={(v) => set({ unit: v ?? "" })} />
        <Input type="select" id="sm_filter_status" label="Etapa" prompt="Todas as etapas" options={STATUS_OPTIONS} value={filters.status} onChange={(v) => set({ status: v ?? "" })} />
        <Input type="select" id="sm_filter_prio" label="Prioridade" prompt="Todas as prioridades" options={PRIO_OPTIONS} value={filters.prio} onChange={(v) => set({ prio: v ?? "" })} />
        <Input
          type="select"
          id="sm_filter_sort"
          label="Mostrar"
          options={[
            ["Mais recentes", "recentes"],
            ["Mais pessoas afetadas", "afetados"],
            ...(role === "solicitante" ? ([["Minhas solicitações", "minhas"], ["Que me afetam", "afetam"]] as const) : []),
          ]}
          value={filters.sort}
          clear={false}
          onChange={(v) => set({ sort: (v as Sort) || "recentes" })}
        />
      </div>

      {/* A legenda vem antes dos dados, nas três visualizações: entre os filtros e as SMs. */}
      <PrioLegend />

      {view === "cards" && <Cards sms={rows} role={role} emptyText={empty} onOpen={onOpen} />}
      {view === "lista" && (
        <Table
          id="sm_list"
          rows={rows}
          rowId={(s) => s.id}
          rowClick={onOpen}
          emptyMessage={empty}
          col={[
            { label: "Código", render: (s) => <span className="whitespace-nowrap tabular-nums font-bold">{s.id}</span> },
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
            ...(role === "solicitante"
              ? [{ label: "Ação", render: (s: Sm) => (isClosed(s) ? <Outcome s={s} /> : isMine(s, role) ? <Tag item="Sua solicitação" variant="light-blue" leftIcon="fa-user" className="whitespace-nowrap" /> : <AffectButton s={s} role={role} size="small" />) }]
              : []),
          ]}
        />
      )}
      {/* A grade com minmax(0, 1fr) impede as nove colunas do kanban de alargarem a página: ele rola por dentro. */}
      {view === "kanban" && (
        <div className="grid grid-cols-[minmax(0,1fr)]">
          <Board sms={rows} role={role} onOpen={onOpen} />
        </div>
      )}

    </div>
  );
}

/** A legenda das prioridades, logo abaixo dos filtros, em cards, lista e kanban. */
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

/** A cor de cada etapa no quadro, pelo tom dela: fundo da coluna e bolinha do cabeçalho (como no funil do CRM). */
const COLUMN_BG: Record<Tone, string> = {
  blue: "bg-blue/10", purple: "bg-purple/10", yellow: "bg-yellow/10", orange: "bg-brand-orange/10",
  green: "bg-green/10", red: "bg-red/10", navy: "bg-brand-purple-dark/5",
};
const COLUMN_DOT: Record<Tone, string> = {
  blue: "bg-blue", purple: "bg-purple", yellow: "bg-yellow", orange: "bg-brand-orange",
  green: "bg-green", red: "bg-red", navy: "bg-brand-purple-dark/60",
};

/**
 * O quadro por etapa, no mesmo desenho do funil do CRM de Leads (branch `crm`,
 * `screens/crm/Board.tsx`), para os dois virarem um componente só. A diferença:
 * aqui não se arrasta; a etapa só anda pelo detalhe, e clicar no cartão o abre.
 */
function Board({ sms, role, onOpen }: { sms: Sm[]; role: Role; onOpen: (s: Sm) => void }) {
  return (
    <div className="-mx-6 flex items-start gap-3.5 overflow-x-auto px-6 pb-2.5 thin-scrollbar">
      {ORDER.map((k) => {
        const st = STATUS[k];
        const items = sms.filter((s) => s.status === k).sort((a, b) => prioRank(a) - prioRank(b) || (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1));
        return (
          <section key={k} aria-label={st.label} className={cx("flex min-h-44 w-66 flex-none flex-col gap-2.5 rounded-2xl border border-transparent p-3", COLUMN_BG[st.tone])}>
            <header className="flex items-center gap-2 px-1">
              <span className={cx("h-2 w-2 flex-none rounded-full", COLUMN_DOT[st.tone])} />
              <h3 className="flex-1 truncate text-sm font-extrabold text-brand-purple-dark">{st.label}</h3>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-extrabold text-brand-purple-dark/70">{items.length}</span>
            </header>
            <p className="px-1 text-xs font-semibold text-brand-purple-dark/50">{st.owner || "—"}</p>
            <div className="flex flex-col gap-2.5">
              {items.map((s) => (
                <SmCard key={s.id} sm={s} role={role} onClick={() => onOpen(s)} />
              ))}
              {items.length === 0 && <p className="py-4 text-center text-sm text-brand-purple-dark/40">Nenhuma solicitação</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/**
 * O cartão do quadro, no desenho do cartão de lead do CRM: título e subtítulo,
 * a prioridade no canto, um selo, e o rodapé com o score à esquerda e os dias
 * na etapa à direita. Mais a mesma ação das outras visões, "Também me afeta".
 */
function SmCard({ sm: s, role, onClick }: { sm: Sm; role: Role; onClick: () => void }) {
  const sc = scoreOf(s);
  const mine = role === "solicitante" && isMine(s, role);
  const days = daysInStage(s);
  const sla = SLA_DAYS[s.status as keyof typeof SLA_DAYS];
  const late = sla != null && days > sla;
  // Ações vencidas aparecem para a gestão; o colaborador vê as dele na página.
  const lateActions = role === "solicitante" ? 0 : overdueActions(s).length;
  return (
    <article onClick={onClick} className="cursor-pointer space-y-2.5 rounded-xl bg-white p-3 shadow-main transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 font-bold leading-snug text-brand-purple-dark">{s.title}</p>
          <p className="truncate text-sm text-brand-purple-dark/60">{s.id} · {s.unit}</p>
        </div>
        <span className="flex-none whitespace-nowrap"><PrioTag sm={s} /></span>
      </div>
      <div className="flex flex-wrap gap-1">
        {mine ? (
          <Tag item="Sua solicitação" variant="light-blue" leftIcon="fa-user" className="text-xs" />
        ) : (
          <Tag item={s.area} variant="dark-purple" leftIcon="fa-building" className="text-xs" />
        )}
        {lateActions > 0 && <Tag item={lateActions === 1 ? "1 ação vencida" : `${lateActions} ações vencidas`} variant="red" leftIcon="fa-clock" className="text-xs" />}
      </div>
      <div className="flex items-center justify-between border-t border-brand-purple-dark/10 pt-2 text-xs font-bold">
        <span className="flex items-center gap-3 text-brand-purple-dark/60">
          <span>{sc != null ? `${fmt(sc)} pts${s.effort ? ` · ${s.effort}` : ""}` : "Sem notas"}</span>
          <span title="Pessoas afetadas"><Icon name="fa-users" type="solid" /> {s.affected.length}</span>
        </span>
        <span className={late ? "text-red" : "text-brand-purple-dark/50"} title={late ? `Na etapa há ${days} dias · prazo ${sla}` : "Dias nesta etapa"}>
          {late && <Icon name="fa-hourglass-end" type="solid" className="mr-1" />}
          {days}d
        </span>
      </div>
      {canAffect(s, role) && <AffectButton s={s} role={role} size="small" />}
    </article>
  );
}
