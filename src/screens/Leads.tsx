/**
 * CRM de Leads — `/backoffice/visitas` (`prospect_live/index.ex`).
 *
 * A lista de Leads do Phoenix ganha o funil (kanban por etapa, com arrastar e
 * soltar) ao lado da tabela, filtros de comercial, origem e follow-up, e o
 * painel do negócio por papel no lugar do modal. Efetivar Paciente segue no
 * drawer.
 *
 * A tela monta os dados a partir dos controles (`crm/flow.ts`) sobre a
 * fixture dos leads (`crm/fixtures.ts`).
 */
import { useMemo, useState } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { Header } from "../components/Layout.js";
import { TODAY } from "../components/today.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { Board } from "./crm/Board.js";
import { ConvertDrawer } from "./crm/ConvertDrawer.js";
import { DealPage, tabOfStage } from "./crm/DealPage.js";
import { LEADS, type LeadsFixture } from "./crm/fixtures.js";
import { CRM_CONTROLS, PATH, useControlledState, type Controls } from "./crm/flow.js";
import { LeadsTable } from "./crm/LeadsTable.js";
import {
  FOLLOW_FILTERS, ORIGINS, OWNERS, SUPPORT_LEVELS, blankLead, columnOf, guardianOf, matchFollow,
  type ColumnId, type Lead, type TabId,
} from "./crm/model.js";
import { SearchFilter, SelectFilter, ViewToggle, opts } from "./crm/parts.js";

const CURRENT_USER = { name: "Marina Alves", units: ["Santana", "Zona Leste", "Unidade Teste"], roles: [] };

/** Quem cadastra lead (o botão Novo Lead e o "+ Novo lead" do funil). */
const CAN_CREATE = ["admin", "clinic_admin", "attendant", "coordinator"];

type View = "board" | "table";
type Deal = { key: string; id: string; isNew: boolean; lead: Lead; tab: TabId };
type State = { leads: Lead[]; view: View; deal: Deal | null; convertId: string | null };

const fixtureOf = (context: ScenarioContext): LeadsFixture => {
  const data = context.fixture?.data;
  return ((typeof data === "function" ? data() : data) as LeadsFixture | undefined) ?? { leads: LEADS };
};

function openDeal(leads: Lead[], id: string | undefined, tab?: string): Deal | null {
  if (!id || id === "closed") return null;
  if (id === "new") return { key: `new-${Date.now()}`, id: "new", isNew: true, lead: blankLead(), tab: (tab as TabId) ?? "negocio" };
  const lead = leads.find((l) => l.id === id);
  if (!lead) return null;
  return { key: `${id}-${Date.now()}`, id, isNew: false, lead, tab: (tab as TabId) ?? tabOfStage(lead.status) };
}

function derive(s: State, c: Controls): Controls {
  return {
    view: s.view,
    lead: s.deal ? s.deal.id : "closed",
    tab: s.deal ? s.deal.tab : c.tab ?? "negocio",
    convert: s.convertId ? "open" : "closed",
  };
}

function LeadsScreen({ context }: { context: ScenarioContext }) {
  const fixture = fixtureOf(context);
  const role = context.persona?.id ?? "admin";
  const canCreate = CAN_CREATE.includes(role);

  const [state, setState] = useControlledState<State>(context, {
    groups: CRM_CONTROLS,
    seed: (c, prev, changed) => {
      const leads = prev?.leads ?? fixture.leads;
      const view = (c.view as View) ?? "board";
      let deal = prev?.deal ?? null;
      if (!prev || changed?.includes("lead")) deal = openDeal(leads, c.lead, prev && !changed?.includes("tab") ? undefined : c.tab);
      else if (deal && changed?.includes("tab")) deal = { ...deal, tab: c.tab as TabId };
      let convertId = prev?.convertId ?? null;
      if (!prev || changed?.includes("convert")) {
        const target = deal && !deal.isNew ? deal.lead : leads.find((l) => l.status === "aguardando");
        convertId = c.convert === "open" && target ? target.id : null;
      }
      return { leads, view, deal, convertId };
    },
    derive,
  });

  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("");
  const [origin, setOrigin] = useState("");
  const [follow, setFollow] = useState("");
  const [support, setSupport] = useState("");
  const [title, setTitle] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return state.leads.filter((l) => {
      const g = guardianOf(l);
      return (!term || l.child.toLowerCase().includes(term) || g.name.toLowerCase().includes(term) || g.phone.includes(term) || g.email.toLowerCase().includes(term)) &&
        (!owner || l.owner === owner) &&
        (!origin || l.origin === origin) &&
        (!follow || matchFollow(l.nextFollowUp, follow)) &&
        (!support || (l.support || "A definir") === support);
    });
  }, [state.leads, q, owner, origin, follow, support]);

  // `put_toast/2`: `close_time` padrão de 3000.
  const toast = (title: string, content: string) => showToast({ title, content, type: "success", closeTime: 3000 });

  const patchLead = (lead: Lead) =>
    setState((s) => ({ ...s, leads: s.leads.map((l) => (l.id === lead.id ? { ...lead, updatedAt: TODAY } : l)) }));

  const open = (lead: Lead | null) =>
    setState((s) => ({ ...s, deal: lead ? openDeal(s.leads, lead.id) : openDeal(s.leads, "new") }));

  const closeDeal = () => setState((s) => ({ ...s, deal: null }));

  function create(lead: Lead) {
    const created = { ...lead, id: `ld-${Date.now()}` };
    setState((s) => ({ ...s, leads: [created, ...s.leads], deal: null }));
    toast("Sucesso!", "Lead criado com sucesso!");
  }

  function drop(lead: Lead, to: ColumnId) {
    if (to === "efetivado") {
      setState((s) => ({ ...s, convertId: lead.id }));
      return;
    }
    const label = columnOf(to).label;
    patchLead({
      ...lead, status: to, stageSince: TODAY,
      timeline: [{ id: `t-${Date.now()}`, kind: "stage", text: `Movido para ${label}`, at: TODAY, by: lead.owner || "Você" }, ...lead.timeline],
    });
    toast("Etapa atualizada", `${lead.child} → ${label}`);
  }

  function convert(lead: Lead) {
    setState((s) => ({ ...s, leads: s.leads.filter((l) => l.id !== lead.id), convertId: null, deal: null }));
    toast("Sucesso!", `${lead.child} efetivado(a) como paciente.`);
  }

  const converting = state.convertId ? state.leads.find((l) => l.id === state.convertId) ?? null : null;
  const deal = state.deal;

  // O breadcrumb "Leads" dentro do negócio fecha o painel em vez de navegar.
  const layoutContext = {
    ...context,
    navigate: (to: string) => {
      if (deal && to === PATH) window.dispatchEvent(new Event("crm:close-deal"));
      else context.navigate(to);
    },
  };

  return (
    <BackofficeLayout
      context={layoutContext}
      currentPath={PATH}
      breadcrumbs={deal ? [{ label: "Leads", to: PATH }, { label: title || deal.lead.child || "Novo negócio" }] : [{ label: "Leads" }]}
      currentUser={CURRENT_USER}
    >
      {deal ? (
        <DealPage
          key={deal.key}
          lead={deal.lead}
          isNew={deal.isNew}
          tab={deal.tab}
          onTab={(tab) => { setState((s) => (s.deal ? { ...s, deal: { ...s.deal, tab } } : s)); window.scrollTo({ top: 0 }); }}
          onPatch={patchLead}
          onCreate={create}
          onClose={closeDeal}
          onConvert={(l) => setState((s) => ({ ...s, convertId: l.id }))}
          onTitle={setTitle}
        />
      ) : (
        <Card>
          <Header
            variant="large"
            className="mb-6"
            actions={
              <div className="flex items-center gap-4">
                <ViewToggle
                  options={[{ id: "board", title: "Funil", icon: "fa-table-columns" }, { id: "table", title: "Tabela", icon: "fa-table-list" }]}
                  value={state.view}
                  onChange={(view) => setState((s) => ({ ...s, view }))}
                />
                {canCreate && <Button type="button" rightIcon="fa-plus" onClick={() => open(null)}>Novo Lead</Button>}
              </div>
            }
          >
            Leads
          </Header>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SearchFilter id="filters_search" label="Buscar" placeholder="Buscar por nome, responsável, telefone ou e-mail" value={q} onChange={setQ} />
            <SelectFilter id="filters_owner" label="Responsável comercial" prompt="Todos" options={opts(OWNERS)} value={owner} onChange={setOwner} />
            <SelectFilter id="filters_source" label="Origem" prompt="Todas" options={opts(ORIGINS)} value={origin} onChange={setOrigin} />
            <SelectFilter id="filters_follow_up" label="Follow-up" prompt="Todos" options={FOLLOW_FILTERS.map((f) => [f.label, f.id] as const)} value={follow} onChange={setFollow} />
            <SelectFilter id="filters_support_level" label="Suporte" prompt="Todos" options={opts([...SUPPORT_LEVELS, "A definir"])} value={support} onChange={setSupport} />
          </div>

          {state.view === "board" ? (
            <Board leads={rows} canCreate={canCreate} onOpen={open} onDrop={drop} onNew={() => open(null)} />
          ) : (
            <LeadsTable leads={rows} onEdit={open} onConvert={(l) => setState((s) => ({ ...s, convertId: l.id }))} />
          )}
        </Card>
      )}

      <ConvertDrawer lead={converting} onClose={() => setState((s) => ({ ...s, convertId: null }))} onConfirm={convert} />
    </BackofficeLayout>
  );
}

export function Leads({ context }: ScreenProps) {
  if (context.isLoading) return null;
  // Cada atalho começa dos dados da fixture, sem herdar o que se fez no anterior.
  return <LeadsScreen key={`${context.scenario?.id}|${context.fixture?.id}`} context={context} />;
}
