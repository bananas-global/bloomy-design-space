/**
 * Acompanhamento periódico — a ficha do paciente com o drawer de
 * acompanhamento aberto pelo menu ⋮ do card
 * (`patient_live/components/periodic_monitorings/`), no design novo.
 *
 * A tela monta os dados a partir dos controles (`acompanhamento-periodico/flow.ts`)
 * sobre a fixture do paciente (`acompanhamento-periodico/fixtures.ts`).
 */
import { useEffect } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { PatientLayout } from "../layouts/PatientLayout.js";
import { TODAY } from "../components/today.js";
import { MONITORINGS, PATIENT, type MonitoringFixture } from "./acompanhamento-periodico/fixtures.js";
import { MONITORING_CONTROLS, useControlledState, type Controls, type DrawerState } from "./acompanhamento-periodico/flow.js";
import { LevelTag, MonitoringDrawer, type DrawerView } from "./acompanhamento-periodico/MonitoringDrawer.js";
import { scoreOf, type Answers, type Monitoring } from "./acompanhamento-periodico/model.js";

const CURRENT_USER = { name: "Marina Alves", units: ["Santana"], roles: [] };

const [YEAR, MONTH, DAY] = TODAY.split("-");
const TODAY_BR = `${DAY}/${MONTH}/${YEAR}`;

type State = { monitorings: Monitoring[]; open: boolean; view: DrawerView };

const fixtureOf = (context: ScenarioContext) =>
  (context.data as MonitoringFixture | undefined) ?? { patient: PATIENT, monitorings: MONITORINGS };

function viewOf(drawer: string | undefined, monitorings: Monitoring[]): Pick<State, "open" | "view"> {
  const first = monitorings[0];
  switch (drawer as DrawerState | undefined) {
    case "list":
      return { open: true, view: { kind: "list" } };
    case "new":
      return { open: true, view: { kind: "new" } };
    case "view":
      return { open: true, view: first ? { kind: "view", id: first.id } : { kind: "list" } };
    case "edit":
      return { open: true, view: first ? { kind: "edit", id: first.id } : { kind: "list" } };
    default:
      return { open: false, view: { kind: "list" } };
  }
}

function derive(s: State): Controls {
  return { drawer: s.open ? s.view.kind : "closed" };
}

function MonitoringScreen({ context }: { context: ScenarioContext }) {
  const fixture = fixtureOf(context);
  const [state, setState] = useControlledState<State>(context, {
    groups: MONITORING_CONTROLS,
    seed: (c, prev) => {
      const monitorings = prev?.monitorings ?? fixture.monitorings;
      return { monitorings, ...viewOf(c.drawer, monitorings) };
    },
    derive,
  });

  const role = context.persona?.id ?? "admin";
  const policy = {
    create: context.can("periodic_monitorings.create"),
    edit: context.can("periodic_monitorings.edit"),
    delete: context.can("periodic_monitorings.delete"),
  };
  const draft: Monitoring = { id: "new", date: TODAY_BR, author: { name: CURRENT_USER.name, role }, answers: {} };
  const latest = state.monitorings[0] ? scoreOf(state.monitorings[0].answers).level : null;

  // Cada troca de estado começa do topo, como o `phx:drawerScrollTop`.
  const viewKey = JSON.stringify(state.view);
  useEffect(() => {
    document.getElementById("periodic_monitoring_drawer-content")?.scrollTo(0, 0);
  }, [viewKey]);

  const navigate = (view: DrawerView) => setState((s) => ({ ...s, view }));
  // `put_toast/2`: `close_time` padrão de 3000.
  const success = (content: string) => showToast({ title: "Sucesso!", content, type: "success", closeTime: 3000 });

  function create(answers: Answers) {
    const created: Monitoring = { ...draft, id: `pm-${Date.now()}`, answers };
    setState((s) => ({ ...s, monitorings: [created, ...s.monitorings], view: { kind: "list" } }));
    success("Acompanhamento periódico criado.");
  }

  function update(id: string, answers: Answers) {
    setState((s) => ({
      ...s,
      monitorings: s.monitorings.map((m) => (m.id === id ? { ...m, answers, edited: { by: CURRENT_USER.name, at: TODAY_BR } } : m)),
      view: { kind: "list" },
    }));
    success("Acompanhamento periódico atualizado.");
  }

  function remove(id: string) {
    setState((s) => ({ ...s, monitorings: s.monitorings.filter((m) => m.id !== id), view: { kind: "list" } }));
    success("Acompanhamento periódico excluído.");
  }

  return (
    <BackofficeLayout
      context={context}
      currentPath="/backoffice/pacientes"
      breadcrumbs={[{ label: "Pacientes", to: "/backoffice/pacientes" }, { label: fixture.patient.name }]}
      currentUser={CURRENT_USER}
    >
      <PatientLayout
        context={context}
        patient={fixture.patient}
        onPeriodicMonitoring={() => setState((s) => ({ ...s, open: true, view: { kind: "list" } }))}
        extraTags={latest && <LevelTag level={latest} prefix="Acomp. " />}
      />
      <MonitoringDrawer
        show={state.open}
        view={state.view}
        items={state.monitorings}
        draft={draft}
        policy={policy}
        onClose={() => setState((s) => ({ ...s, open: false, view: { kind: "list" } }))}
        onNavigate={navigate}
        onCreate={create}
        onUpdate={update}
        onDelete={remove}
      />
    </BackofficeLayout>
  );
}

export function PatientPeriodicMonitoring({ context }: ScreenProps) {
  if (context.isLoading) return null;
  return <MonitoringScreen key={context.fixture?.id} context={context} />;
}
