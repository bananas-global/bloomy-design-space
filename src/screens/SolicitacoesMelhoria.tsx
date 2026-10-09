/**
 * Solicitações de melhoria (SM) — proposta nova, sem equivalente no Phoenix.
 *
 * Trazido do protótipo `Solicitações de Melhoria v2` do Claude Design para os
 * componentes do sistema. Quatro telas; no menu lateral, só o item Solicitações
 * de melhoria
 * (`solicitacoes-melhoria/flow.ts`):
 * - Solicitações de melhoria: qualquer colaborador, pelo menu do usuário. As SMs de
 *   todos em cards, lista ou kanban, para acompanhar e dizer "Também me afeta".
 * - Gestão: PMO e Tech, por URL; sem a permissão, barra.
 * - Nova solicitação: o formulário numa página, aberto pelas duas acima.
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
  MANAGE_CONTROLS, MINE_CONTROLS, NEW_PATH, PATH, TABS, detailPath, homeOf, roleOf, setTrackedTab, useControlledState,
  type Area, type Controls, type TabId,
} from "./solicitacoes-melhoria/flow.js";
import { PRIO, STATUS, TODAY_BR, USERS, daysFromToday, fmt, isMine, prioOf, reachOf, routeText, scoreOf, type Role, type Sm } from "./solicitacoes-melhoria/model.js";
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

/**
 * O contexto da moldura: o detalhe e a gestão recebem o papel; Minhas
 * solicitações não tem esse controle. A query do link (`?aba=…`) vira controle,
 * para o breadcrumb abrir a aba certa.
 */
function layoutContext(context: ScenarioContext, role: Role) {
  return {
    ...context,
    navigate: (to: string) => {
      const [path = to, query] = to.split("?");
      const extra = Object.fromEntries(new URLSearchParams(query));
      return context.navigate(path, { controls: path === PATH ? extra : { papel: role, ...extra } });
    },
  };
}

/**
 * A moldura das telas de SM: backoffice com o item do menu do usuário. O menu
 * lateral fica só com Solicitações de melhoria, que leva cada papel à tela dele
 * (o colaborador às solicitações, PMO e Tech à gestão). Na Nova solicitação, sem
 * o menu lateral e o cabeçalho (`hide_menu`), para o foco ficar no formulário.
 */
function SmLayout({ context, role, breadcrumbs, notifications, hideMenu, children }: {
  context: ScenarioContext;
  role: Role;
  breadcrumbs: { label: string; to?: string }[];
  notifications: SmNotification[];
  hideMenu?: boolean;
  children: ReactNode;
}) {
  return (
    <BackofficeLayout
      key={role}
      context={layoutContext(context, role)}
      currentPath={homeOf(role)}
      menu={[{ to: homeOf(role), title: "Solicitações de melhoria", icon: "fa-lightbulb" }]}
      breadcrumbs={breadcrumbs}
      currentUser={userOf(role)}
      notifications={notificationsOf(notifications, role)}
      improvementRequests
      hideMenu={hideMenu}
    >
      {children}
    </BackofficeLayout>
  );
}

/* ============================================================
   Minhas solicitações e Gestão
   ============================================================ */

type HubState = { tab: TabId; view: View; filters: Filters };

/** As abas da gestão; Minhas solicitações é uma página só, sem abas. */
const tabsOf = (area: Area, role: Role) => (area === "mine" ? [] : TABS[role === "tech" ? "tech" : "pmo"]);

/** As visualizações: as mesmas três para todos; o colaborador abre nos cards. */
const viewsOf = (area: Area): View[] => (area === "mine" ? ["cards", "lista", "kanban"] : ["lista", "kanban", "cards"]);

function hubOptions(area: Area) {
  const roleIn = (c: Controls): Role => (area === "mine" ? "solicitante" : roleOf(c));
  const seed = (c: Controls, prev?: HubState, changed?: string[]): HubState => {
    const role = roleIn(c);
    const tabs = tabsOf(area, role);
    const views = viewsOf(area);
    const fresh: HubState = {
      tab: (tabs.find((t) => t.id === c.aba) ?? tabs[0])?.id ?? "solicitacoes",
      view: views.includes(c.view as View) ? (c.view as View) : area === "mine" ? "cards" : role === "tech" ? "kanban" : "lista",
      // O colaborador abre nas que mais afetam gente; a gestão, nas mais recentes.
      filters: { ...EMPTY_FILTERS, sort: area === "mine" ? "afetados" : "recentes" },
    };
    if (!prev || !changed) return fresh;
    return {
      tab: changed.includes("aba") || changed.includes("papel") ? fresh.tab : prev.tab,
      view: changed.includes("view") ? fresh.view : prev.view,
      filters: prev.filters,
    };
  };
  const derive = (s: HubState, c: Controls): Controls =>
    area === "mine" ? { view: s.view } : { papel: roleIn(c), aba: s.tab, view: s.view };
  return { groups: area === "mine" ? MINE_CONTROLS : MANAGE_CONTROLS, seed, derive, roleIn };
}

const HUB = { mine: hubOptions("mine"), manage: hubOptions("manage") };

function HubScreen({ context, area }: { context: ScenarioContext; area: Area }) {
  const options = HUB[area];
  const role = options.roleIn(context.controls);
  const data = useSmData(context);
  const [state, setState] = useControlledState<HubState>(context, options);

  const tabs = tabsOf(area, role);
  const active = tabs.find((t) => t.id === state.tab) ?? tabs[0];
  // A aba vai para a URL antes de as `card_tabs` montarem, mas só quando muda
  // aqui (controle ou papel): no clique, quem escreve a URL é a própria aba.
  const forced = useRef("");
  if (active && forced.current !== `${role}|${active.id}`) {
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
  // Excluída some da lista dos colaboradores; só quem pediu ainda a vê.
  const visible = area === "manage" ? data.sms : data.sms.filter((s) => s.status !== "excluida" || isMine(s, role));
  const title = area === "mine" ? "Solicitações de melhoria" : "Gestão de melhorias";
  const crumbs = active ? [{ label: title }, { label: active.title }] : [{ label: title }];

  if (context.error) {
    return (
      <SmLayout context={context} role={role} breadcrumbs={[{ label: title }]} notifications={data.notifications}>
        <LoadError onRetry={() => window.location.reload()} />
      </SmLayout>
    );
  }

  if (area === "manage" && role === "solicitante") {
    return (
      <SmLayout context={context} role={role} breadcrumbs={[{ label: title }]} notifications={data.notifications}>
        <Card>
          <EmptyStateCard icon="fa-lock" text="Você não tem acesso à gestão de melhorias">
            <p>A gestão é do PMO e da Tech. Suas solicitações estão em Solicitações de melhoria, no menu do seu usuário.</p>
            <Button type="button" className="mx-auto mt-4" onClick={() => context.navigate(PATH)}>Ver minhas solicitações</Button>
          </EmptyStateCard>
        </Card>
      </SmLayout>
    );
  }

  const list = (
    <Solicitacoes
      sms={visible}
      all={data.sms}
      role={role}
      view={state.view}
      views={viewsOf(area)}
      onView={(view) => setState((s) => ({ ...s, view }))}
      title={area === "manage"}
      filters={state.filters}
      onFilters={(filters) => setState((s) => ({ ...s, filters }))}
      onOpen={open}
    />
  );

  const subtitle =
    area === "mine"
      ? "Abra uma solicitação, acompanhe o andamento e diga quando um problema dos colegas também afeta a sua rotina."
      : role === "tech"
        ? "A fila de parametrização e desenvolvimento e a homologação das entregas."
        : "Triagem, priorização, backlog e ganhos das solicitações de mudança e melhoria.";

  const header = (
    <Header
      variant="large"
      subtitle={subtitle}
      actions={
        <div className="flex flex-wrap gap-3">
          {area === "manage" && (
            <Button type="button" variant="outline" leftIcon="fa-file-export" onClick={() => exportCsv(data.sms)}>
              Exportar base (.csv)
            </Button>
          )}
          {role !== "tech" && (
            <Button type="button" leftIcon="fa-plus" onClick={() => context.navigate(NEW_PATH, { controls: { papel: role } })}>
              Nova solicitação
            </Button>
          )}
        </div>
      }
    >
      {title}
    </Header>
  );

  if (area === "mine") {
    return (
      <SmLayout context={context} role={role} breadcrumbs={crumbs} notifications={data.notifications}>
        <Card className="space-y-6">
          {header}
          {list}
        </Card>
      </SmLayout>
    );
  }

  const content: Record<TabId, { noCard?: boolean; node: ReactNode }> = {
    painel: { noCard: true, node: <Painel sms={data.sms} monthly={data.monthly} role={role} onOpen={open} /> },
    solicitacoes: { node: list },
  };

  return (
    <SmLayout context={context} role={role} breadcrumbs={crumbs} notifications={data.notifications}>
      <CardTabs
        key={`${role}-${active!.id}`}
        id={TABS_ID}
        trackerId={TRACKER}
        tab={tabs.map((t) => ({ title: t.title, noCard: content[t.id].noCard, content: content[t.id].node }))}
        header={header}
      />
    </SmLayout>
  );
}

/** Falha ao carregar (rede em erro): o `empty_state_card/1` com o tentar de novo. */
function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <EmptyStateCard icon="fa-triangle-exclamation" text="Não foi possível carregar as solicitações">
        <p>Verifique a sua conexão e tente de novo. Se continuar, avise a equipe de Tecnologia.</p>
        <Button type="button" className="mx-auto mt-4" leftIcon="fa-rotate-right" onClick={onRetry}>Tentar de novo</Button>
      </EmptyStateCard>
    </Card>
  );
}

/** Baixa a base em CSV com separador `;`, como o protótipo. */
function exportCsv(sms: Sm[]) {
  const cols = ["ID SM", "Data", "Solicitante", "Área", "Unidade", "Título", "Tipo", "Workaround", "Score", "Prioridade", "Esforço", "Etapa", "Direcionamento", "Pessoas afetadas", "Unidades afetadas", "Ganho", "Horas/mês", "Concluída em"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = sms.map((s) => {
    const p = prioOf(s);
    return [s.id, s.createdAt, s.requester, s.area, s.unit, s.title, s.type, s.workaround, fmt(scoreOf(s)), p ? PRIO[p].full : "", s.effort, STATUS[s.status].label, routeText(s.routes), s.affected.length, reachOf(s).units.length, s.gainType, s.gainHours, s.closedAt]
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

export function MyImprovementRequests({ context }: ScreenProps) {
  if (context.isLoading) return null;
  return <HubScreen context={context} area="mine" />;
}

export function ImprovementRequestsManagement({ context }: ScreenProps) {
  if (context.isLoading) return null;
  return <HubScreen context={context} area="manage" />;
}

/* ============================================================
   Nova solicitação
   ============================================================ */

function NewScreen({ context }: { context: ScenarioContext }) {
  const role: Role = context.controls.papel === "pmo" ? "pmo" : "solicitante";
  const data = useSmData(context);
  const home = homeOf(role);
  const back = () => (home === PATH ? context.navigate(PATH) : context.navigate(home, { controls: { papel: role } }));
  const crumb = home === PATH ? "Solicitações de melhoria" : "Gestão de melhorias";

  return (
    <SmLayout context={context} role={role} breadcrumbs={[{ label: crumb, to: home }, { label: "Nova solicitação" }]} notifications={data.notifications} hideMenu>
      <NovaSolicitacao
        key={role}
        role={role}
        sms={data.sms}
        onCancel={back}
        onSubmit={(form) => context.navigate(detailPath(actions.submit(form)), { controls: { papel: role, aviso: "enviada" } })}
      />
    </SmLayout>
  );
}

export function NewImprovementRequest({ context }: ScreenProps) {
  if (context.isLoading) return null;
  return <NewScreen context={context} />;
}

/* ============================================================
   Detalhe
   ============================================================ */

function DetailScreen({ context, id }: { context: ScenarioContext; id: string }) {
  const role = roleOf(context.controls);
  const data = useSmData(context);
  const s = data.sms.find((x) => x.id === id);
  const home = homeOf(role);
  // Abrir o detalhe conta uma visualização (uma por SM na sessão).
  useEffect(() => actions.view(id), [id]);
  const back = () => (home === PATH ? context.navigate(PATH) : context.navigate(home, { controls: { papel: role } }));
  const crumb = home === PATH ? "Solicitações de melhoria" : "Gestão de melhorias";
  // Minhas solicitações é a própria lista; na gestão, a aba Solicitações.
  const breadcrumbs = home === PATH
    ? [{ label: crumb, to: home }, { label: id }]
    : [{ label: crumb, to: home }, { label: "Solicitações", to: `${home}?aba=solicitacoes` }, { label: id }];

  return (
    <SmLayout context={context} role={role} breadcrumbs={breadcrumbs} notifications={data.notifications}>
      {context.error ? (
        <LoadError onRetry={() => window.location.reload()} />
      ) : s ? (
        <Detalhe s={s} role={role} sent={context.controls.aviso === "enviada"} onDismissSent={() => context.setControl("aviso", "nenhum")} />
      ) : (
        <Card>
          <EmptyStateCard icon="fa-magnifying-glass" text="Solicitação não encontrada">
            <Button type="button" className="mx-auto mt-4" onClick={back}>Voltar para as solicitações</Button>
          </EmptyStateCard>
        </Card>
      )}
    </SmLayout>
  );
}

export function ImprovementRequest({ context, params }: ScreenProps) {
  if (context.isLoading) return null;
  return <DetailScreen context={context} id={params.id ?? ""} />;
}
