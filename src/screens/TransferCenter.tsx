/**
 * Central de Transferências — nova página do backoffice (v2 do protótipo).
 * Novo — não existe no Phoenix.
 *
 * Movimentação em bloco dos mapas de horas dos pacientes, feita antes de
 * inativar ou alterar a escala de um profissional, e cobertura pontual de
 * sessões de um período. Os `button_tabs` Mapas de horas / Sessões do período
 * ficam no card da lista; ao lado, o painel da sub-aba aberta. A sub-aba fica
 * na URL pelo `tracker_id` (`?transfer_tab=transfer_center|sessoes-do-periodo`).
 *
 * A tela monta os dados a partir dos controles (`central-transferencias/flow.ts`)
 * sobre a unidade do protótipo (`central-transferencias/fixtures.ts`).
 */
import { useEffect, useState } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { Card } from "../components/Card.js";
import { ButtonTabs, ensureTrackedTab, titleToSlug, useTrackedTab } from "../components/Tabs.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { HOURS_MAPS, PROFESSIONALS, SCHEDULED, TODAY, type TransferCenterFixture } from "./central-transferencias/fixtures.js";
import { TAB_ID, TAB_TRACKER, TRANSFER_CENTER_CONTROLS, useControlledState, type Controls } from "./central-transferencias/flow.js";
import { MapsList, MapsSide } from "./central-transferencias/MapsTab.js";
import { addDays } from "./central-transferencias/model.js";
import { ListTitle } from "./central-transferencias/parts.js";
import { SessionsList, SessionsSide } from "./central-transferencias/SessionsTab.js";
import {
  FIRST_DAY,
  TransferCenterProvider,
  withDistributedMaps,
  withDistributedSessions,
  type TransferCenterState,
} from "./central-transferencias/store.js";

const CURRENT_USER = {
  name: "Marina Alves",
  units: ["Unidade Teste", "Santana"],
  roles: [],
  professional: false,
};

const SESSIONS_TAB = "Sessões do período";
const SESSIONS_SLUG = titleToSlug(SESSIONS_TAB);

/** O fim do período "Uma semana": seis dias depois do primeiro dia útil. */
const WEEK_END = addDays(FIRST_DAY, 6);

const fixtureOf = (context: ScenarioContext): TransferCenterFixture =>
  (context.data as TransferCenterFixture | undefined) ?? { professionals: PROFESSIONALS, maps: HOURS_MAPS, scheduled: SCHEDULED };

function seedWith(fixture: TransferCenterFixture) {
  return function seed(c: Controls, prev?: TransferCenterState, changed?: string[]): TransferCenterState {
    const has = (id: string) => !prev || Boolean(changed?.includes(id));
    let s: TransferCenterState = prev ?? {
      professionals: fixture.professionals,
      maps: fixture.maps,
      scheduled: fixture.scheduled,
      origin: "",
      assign: {},
      cross: false,
      why: "",
      open: {},
      when: "now",
      startDate: addDays(TODAY, 7),
      sFrom: FIRST_DAY,
      sTo: FIRST_DAY,
      sSpec: "",
      sProf: "",
      sCross: false,
      sAssign: {},
      sApplied: {},
      sReason: "",
      sNote: "",
      sWhy: "",
      sOpen: {},
    };

    /* Mapas de horas */
    if (has("scheduled")) s = { ...s, scheduled: c.scheduled === "none" ? [] : fixture.scheduled };
    if (has("origin")) s = { ...s, origin: !c.origin || c.origin === "auto" ? "" : c.origin, assign: {}, open: {}, why: "" };
    if (has("cross")) s = { ...s, cross: c.cross === "on", assign: {} };
    if (has("when")) s = { ...s, when: c.when === "prog" ? "prog" : "now" };
    if (["scheduled", "origin", "cross", "distribute"].some(has)) {
      s = { ...s, assign: c.distribute === "auto" ? withDistributedMaps({ ...s, assign: {} }).assign : has("distribute") ? {} : s.assign };
    }

    /* Sessões do período */
    if (has("period")) s = { ...s, sFrom: FIRST_DAY, sTo: c.period === "week" ? WEEK_END : FIRST_DAY, sAssign: {}, sApplied: {} };
    if (has("sCross")) s = { ...s, sCross: c.sCross === "on", sAssign: {} };
    if (["period", "sCross", "sDistribute"].some(has)) {
      s = { ...s, sAssign: c.sDistribute === "auto" ? withDistributedSessions({ ...s, sAssign: {} }).assign : has("sDistribute") ? {} : s.sAssign };
    }
    return s;
  };
}

function derive(s: TransferCenterState, c: Controls): Controls {
  const period = s.sFrom === FIRST_DAY && s.sTo === FIRST_DAY ? "day" : s.sFrom === FIRST_DAY && s.sTo === WEEK_END ? "week" : (c.period ?? "day");
  return {
    origin: s.origin || "auto",
    cross: s.cross ? "on" : "off",
    distribute: Object.keys(s.assign).length ? "auto" : "none",
    when: s.when,
    scheduled: s.scheduled.length ? "with" : "none",
    period,
    sCross: s.sCross ? "on" : "off",
    sDistribute: Object.keys(s.sAssign).length ? "auto" : "none",
  };
}

/**
 * A sub-aba aberta, pelo `tracker_id`. Quando a tela muda um controle, o motor
 * reescreve a query string só com os controles e o parâmetro da aba some da
 * URL, mas os `button_tabs` continuam na aba: vale a última lida, que volta
 * para a URL.
 */
function useOpenTab() {
  const tracked = useTrackedTab(TAB_TRACKER, TAB_ID);
  const [last, setLast] = useState(tracked);
  if (tracked && tracked !== last) setLast(tracked);
  useEffect(() => {
    if (!tracked && last) ensureTrackedTab(TAB_TRACKER, TAB_ID, last);
  });
  return tracked ?? last;
}

function TransferCenterPage() {
  const sessions = useOpenTab() === SESSIONS_SLUG;

  return (
    <div className="grid grid-cols-1 items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]">
      <Card className="min-w-0">
        <ButtonTabs
          id={TAB_ID}
          trackerId={TAB_TRACKER}
          className="flex-row-reverse flex-wrap gap-4"
          actions={<ListTitle>{sessions ? "Transferência de sessões" : "Transferência de mapas de horas"}</ListTitle>}
          tab={[
            { title: "Mapas de horas", content: <MapsList /> },
            { title: SESSIONS_TAB, content: <SessionsList /> },
          ]}
        />
      </Card>
      <div className="min-w-0 min-[1100px]:sticky min-[1100px]:top-4">{sessions ? <SessionsSide /> : <MapsSide />}</div>
    </div>
  );
}

function TransferCenterScreen({ context }: { context: ScenarioContext }) {
  const fixture = fixtureOf(context);
  const [state, setState] = useControlledState<TransferCenterState>(context, {
    groups: TRANSFER_CENTER_CONTROLS,
    seed: seedWith(fixture),
    derive,
  });

  return (
    <TransferCenterProvider state={state} setState={setState}>
      <BackofficeLayout
        context={context}
        currentPath="/backoffice/central_transferencias"
        breadcrumbs={[{ label: "Central de transferências" }]}
        currentUser={CURRENT_USER}
        currentUnit="Unidade Teste"
      >
        <TransferCenterPage />
      </BackofficeLayout>
    </TransferCenterProvider>
  );
}

export function TransferCenter({ context }: ScreenProps) {
  if (context.isLoading) return null;
  return <TransferCenterScreen context={context} />;
}
