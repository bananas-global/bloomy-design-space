/**
 * Relatórios do paciente (v2) — substitui a aba Relatórios do paciente
 * (`patient_live/components/edit_tabs/reports.ex`).
 *
 * Na lista, a tela fica na moldura do backoffice com a ficha do paciente e a
 * aba Relatórios ativa. Ao abrir um relatório (visualizar, preencher, anexar),
 * a view ocupa a página inteira, sem o menu (modo foco do protótipo).
 */
import type { ScreenProps } from "@brucesantos/design-space";
import { ToastWrapper } from "../components/Action.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { PatientLayout } from "../layouts/PatientLayout.js";
import { makeReportsFixture, type ReportsFixture } from "./relatorios/fixtures.js";
import { ReportsList } from "./relatorios/ReportsList.js";
import { ReportsProvider, useReports } from "./relatorios/store.js";
import { FocusView, ModalHost } from "./relatorios/views.js";

const CURRENT_USER = {
  name: "Marcus Vinícius Gimenes",
  units: ["Unidade Teste", "Santana"],
  roles: [],
  professional: true,
};

function Body({ context }: { context: ScreenProps["context"] }) {
  const { patient, view } = useReports();

  if (view.kind !== "list") {
    return (
      <>
        <FocusView />
        <ModalHost />
        <ToastWrapper />
      </>
    );
  }

  return (
    <BackofficeLayout
      context={context}
      currentPath={`/backoffice/pacientes/${patient.id}`}
      breadcrumbs={[{ label: "Pacientes", to: "/backoffice/pacientes" }, { label: patient.name }]}
      currentUser={CURRENT_USER}
      currentUnit="Santana"
    >
      <PatientLayout context={context} patient={patient.header} activeTab="reports" renderTab={(tab) => (tab === "reports" ? <ReportsList /> : null)} />
      <ModalHost />
    </BackofficeLayout>
  );
}

export function PatientReports({ context }: ScreenProps) {
  // O estado da aba é semeado uma vez por fixture: espera o adapter resolver.
  if (context.isLoading) return null;
  const fixture = (context.data as ReportsFixture | undefined) ?? makeReportsFixture();
  return (
    <ReportsProvider key={context.fixture?.id ?? "default"} fixture={fixture} role={context.persona?.id}>
      <Body context={context} />
    </ReportsProvider>
  );
}
