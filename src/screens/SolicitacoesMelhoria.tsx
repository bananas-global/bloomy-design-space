/**
 * Solicitações de melhoria (SM) — proposta nova, sem equivalente no Phoenix.
 *
 * Trazido do protótipo `Solicitações de Melhoria v2` do Claude Design para os
 * componentes do sistema. Duas telas (`solicitacoes-melhoria/flow.ts`):
 * - Central: moldura do backoffice com as `card_tabs` Painel executivo,
 *   Solicitações (lista ou kanban) e Ideias, e o modal Nova solicitação.
 * - Detalhe: a SM com a etapa atual, a governança, as respostas, o fluxo e o
 *   histórico.
 *
 * O que se faz numa tela aparece na outra (`solicitacoes-melhoria/store.ts`).
 */
import { useEffect, useRef, type ReactNode } from "react";
import { showToast } from "../components/Action.js";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { Button } from "../components/Button.js";
import { EmptyStateCard, Header } from "../components/Layout.js";
import { CardTabs, titleToSlug, useTrackedTab } from "../components/Tabs.js";
import { Card } from "../components/Card.js";
import type { UserNotification } from "../components/Notification.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { Detalhe } from "./solicitacoes-melhoria/Detalhe.js";
import type { SmNotification } from "./solicitacoes-melhoria/fixtures.js";
import {
  HUB_CONTROLS, PATH, TABS, detailPath, roleOf, setTrackedTab, useControlledState,
  type Controls, type TabId,
} from "./solicitacoes-melhoria/flow.js";
import { Ideias } from "./solicitacoes-melhoria/Ideias.js";
import { PRIO, STATUS, TODAY_BR, USERS, daysFromToday, fmt, prioOf, routeText, scoreOf, type Role, type Sm } from "./solicitacoes-melhoria/model.js";
import { NovaSolicitacao } from "./solicitacoes-melhoria/NovaSolicitacao.js";
import { Painel } from "./solicitacoes-melhoria/Painel.js";
import { EMPTY_FILTERS, Solicitacoes, type Filters, type View } from "./solicitacoes-melhoria/Solicitacoes.js";
import { sm as actions, useSmData } from "./solicitacoes-melhoria/store.js";

const TRACKER = "sm_tab";
const TABS_ID = "sm";

const userOf = (role: Role) => ({ name: USERS[role].name, units: [USERS.solicitante.unit!], roles: [] });

/** "há N dias" de um carimbo `dd/mm/aaaa hh:mm`, como o `relative_from_now/1`. */
function relative(at: string): string {
  const days = -daysFromToday(at);
  if (days <= 0) return "hoje";
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

/** As notificações da SM no sino do cabeçalho (`NotificationComponent`). */
const notificationsOf = (list: SmNotification[], role: Role): UserNotification[] =>
  list
    .filter((n) => n.forRole === role)
    .map((n) => ({
      id: n.id,
      title: n.title,
      content: `${n.smId} · ${n.text}`,
      insertedAt: relative(n.at),
      ...(n.read ? { readAt: n.at } : {}),
      onClickUrl: detailPath(n.smId),
    }));

/** O que cada papel vê da base: o solicitante, só as dele. */
const visibleTo = (sms: Sm[], role: Role) => (role === "solicitante" ? sms.filter((s) => s.requester === USERS.solicitante.name) : sms);

/** O contexto da moldura: navegar leva o papel junto. */
function layoutContext(context: ScenarioContext, role: Role) {
  return { ...context, navigate: (to: string) => context.navigate(to, { controls: { papel: role } }) };
}

/* ============================================================
   Central
   ============================================================ */

type HubState = { tab: TabId; view: View; nova: boolean; filters: Filters };

const tabsOf = (role: Role) => TABS[role];
const validTab = (role: Role, tab: string | undefined): TabId => {
  const list = tabsOf(role);
  return (list.find((t) => t.id === tab) ?? list[0]!).id;
};

function hubSeed(c: Controls, prev?: HubState, changed?: string[]): HubState {
  const role = roleOf(c);
  const fresh: HubState = {
    tab: validTab(role, c.aba),
    view: c.view === "kanban" || (!c.view && role === "tech") ? "kanban" : "lista",
    nova: c.nova === "aberto",
    filters: EMPTY_FILTERS,
  };
  if (!prev || !changed) return fresh;
  return {
    tab: changed.includes("aba") || changed.includes("papel") ? fresh.tab : prev.tab,
    view: changed.includes("view") ? fresh.view : prev.view,
    nova: changed.includes("nova") ? fresh.nova : prev.nova,
    filters: prev.filters,
  };
}

function hubDerive(s: HubState, c: Controls): Controls {
  return { papel: roleOf(c), aba: s.tab, view: s.view, nova: s.nova ? "aberto" : "fechado" };
}

function HubScreen({ context }: { context: ScenarioContext }) {
  const role = roleOf(context.controls);
  const data = useSmData(context);
  const [state, setState] = useControlledState<HubState>(context, { groups: HUB_CONTROLS, seed: hubSeed, derive: hubDerive });

  const tabs = tabsOf(role);
  const active = tabs.find((t) => t.id === state.tab) ?? tabs[0]!;
  // A aba vai para a URL antes de as `card_tabs` montarem, mas só quando muda
  // aqui (controle ou papel): no clique, quem escreve a URL é a própria aba.
  const forced = useRef("");
  if (forced.current !== `${role}|${active.id}`) {
    forced.current = `${role}|${active.id}`;
    setTrackedTab(TRACKER, TABS_ID, titleToSlug(active.title));
  }

  // Clicar numa aba muda a URL (o `tracker_id`); a tela acompanha.
  const tracked = useTrackedTab(TRACKER, TABS_ID);
  useEffect(() => {
    const tab = tabs.find((t) => titleToSlug(t.title) === tracked);
    if (tab && tab.id !== state.tab) setState((s) => ({ ...s, tab: tab.id }));
  }, [tracked]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (s: Sm) => context.navigate(detailPath(s.id), { controls: { papel: role } });
  const sms = visibleTo(data.sms, role);

  const content: Record<TabId, { noCard?: boolean; node: ReactNode }> = {
    painel: { noCard: true, node: <Painel sms={data.sms} onOpen={open} /> },
    solicitacoes: {
      node: (
        <Solicitacoes
          sms={sms}
          all={data.sms}
          view={state.view}
          onView={(view) => setState((s) => ({ ...s, view }))}
          filters={state.filters}
          onFilters={(filters) => setState((s) => ({ ...s, filters }))}
          onOpen={open}
        />
      ),
    },
    ideias: { noCard: true, node: <Ideias sms={data.sms} onOpen={open} /> },
  };

  const subtitle = {
    pmo: "Triagem, priorização, backlog e ganhos das solicitações de mudança e melhoria.",
    tech: "A fila de parametrização e desenvolvimento e a homologação das entregas.",
    solicitante: "Abra uma solicitação, acompanhe o andamento e apoie as ideias dos colegas.",
  }[role];

  return (
    <BackofficeLayout
      key={role}
      context={layoutContext(context, role)}
      currentPath={PATH}
      breadcrumbs={[{ label: "Solicitações de melhoria" }, { label: active.title }]}
      currentUser={userOf(role)}
      notifications={notificationsOf(data.notifications, role)}
    >
      <CardTabs
        key={`${role}-${active.id}`}
        id={TABS_ID}
        trackerId={TRACKER}
        tab={tabs.map((t) => ({ title: t.title, noCard: content[t.id].noCard, content: content[t.id].node }))}
        header={
          <Header
            variant="large"
            subtitle={subtitle}
            actions={
              <div className="flex flex-wrap gap-3">
                {role !== "solicitante" && (
                  <Button type="button" variant="outline" leftIcon="fa-file-export" onClick={() => exportCsv(data.sms)}>
                    Exportar base (.csv)
                  </Button>
                )}
                {role !== "tech" && (
                  <Button type="button" leftIcon="fa-plus" onClick={() => setState((s) => ({ ...s, nova: true }))}>
                    Nova solicitação
                  </Button>
                )}
              </div>
            }
          >
            Solicitações de melhoria
          </Header>
        }
      />

      <NovaSolicitacao
        show={state.nova}
        role={role}
        onClose={() => setState((s) => ({ ...s, nova: false }))}
        onSubmit={(form) => {
          const id = actions.submit(form);
          setState((s) => ({ ...s, nova: false }));
          context.navigate(detailPath(id), { controls: { papel: role } });
        }}
      />
    </BackofficeLayout>
  );
}

/** Baixa a base em CSV com separador `;`, como o protótipo. */
function exportCsv(sms: Sm[]) {
  const cols = ["ID SM", "Data", "Solicitante", "Área", "Unidade", "Título", "Tipo", "Workaround", "Score", "Prioridade", "Esforço", "Etapa", "Direcionamento", "Ganho", "Horas/mês", "Concluída em"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = sms.map((s) => {
    const p = prioOf(s);
    return [s.id, s.createdAt, s.requester, s.area, s.unit, s.title, s.type, s.workaround, fmt(scoreOf(s)), p ? PRIO[p].full : "", s.effort, STATUS[s.status].label, routeText(s.routes), s.gainType, s.gainHours, s.closedAt]
      .map(esc)
      .join(";");
  });
  const blob = new Blob([`﻿${cols.map(esc).join(";")}\n${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `base-sm-${TODAY_BR.split("/").reverse().join("-")}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  showToast({ title: "Base exportada", content: `${sms.length} SMs em CSV (separador ;).`, type: "success", closeTime: 4000 });
}

export function ImprovementRequests({ context }: ScreenProps) {
  if (context.isLoading) return null;
  return <HubScreen context={context} />;
}

/* ============================================================
   Detalhe
   ============================================================ */

function DetailScreen({ context, id }: { context: ScenarioContext; id: string }) {
  const role = roleOf(context.controls);
  const data = useSmData(context);
  const s = data.sms.find((x) => x.id === id);
  const back = () => context.navigate(PATH, { controls: { papel: role } });

  return (
    <BackofficeLayout
      key={role}
      context={layoutContext(context, role)}
      currentPath={PATH}
      breadcrumbs={[{ label: "Solicitações de melhoria", to: PATH }, { label: id }]}
      currentUser={userOf(role)}
      notifications={notificationsOf(data.notifications, role)}
    >
      {s ? (
        <Detalhe s={s} role={role} onBack={back} />
      ) : (
        <Card>
          <EmptyStateCard icon="fa-magnifying-glass" text="Solicitação não encontrada">
            <Button type="button" className="mx-auto mt-4" onClick={back}>Voltar para as solicitações</Button>
          </EmptyStateCard>
        </Card>
      )}
    </BackofficeLayout>
  );
}

export function ImprovementRequest({ context, params }: ScreenProps) {
  if (context.isLoading) return null;
  return <DetailScreen context={context} id={params.id ?? ""} />;
}
