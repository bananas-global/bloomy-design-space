/**
 * Relatórios do paciente (v2) — substitui a aba Relatórios do paciente
 * (`patient_live/components/edit_tabs/reports.ex`).
 *
 * Um fluxo de cinco telas, cada uma com rota e controles próprios
 * (`relatorios/flow.ts`):
 * - Lista: moldura do backoffice com a ficha do paciente e a aba Relatórios.
 * - Relatório, Editor de modelo, Editor de protocolo e Anexar PDF: página
 *   inteira, sem o menu (modo foco do protótipo).
 *
 * Cada tela abre sozinha pela URL: monta os dados a partir dos controles sobre
 * o conjunto do Lucas (`relatorios/variants.ts`).
 */
import { useEffect, type ReactNode } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { ToastWrapper } from "../components/Action.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { PatientLayout } from "../layouts/PatientLayout.js";
import { FillEditor } from "./relatorios/FillEditor.js";
import { makeReportsFixture, EMPTY_ROUTINE, type ReportsFixture } from "./relatorios/fixtures.js";
import {
  FILL_CONTROLS,
  LIST_CONTROLS,
  PROTOCOL_CONTROLS,
  REPORT_CONTROLS,
  UPLOAD_CONTROLS,
  useControlledState,
  type Controls,
} from "./relatorios/flow.js";
import { EMPTY_FILTERS, relDefaultViewAs, shareable, type Report, type ReportStatus, type ViewAs } from "./relatorios/model.js";
import { ReportsList } from "./relatorios/ReportsList.js";
import { ReportView } from "./relatorios/ReportView.js";
import { session } from "./relatorios/session.js";
import { ReportsProvider, useReports, type ReportsModal, type ReportsState } from "./relatorios/store.js";
import { UploadEditor } from "./relatorios/UploadEditor.js";
import {
  canonicalReport,
  deriveEditor,
  deriveReport,
  editorCanonical,
  editorFromControls,
  editorKindOf,
  findReport,
  reportFromControls,
  withSession,
  withoutLate,
  type EditorKind,
} from "./relatorios/variants.js";
import { ModalHost } from "./relatorios/views.js";

const CURRENT_USER = {
  name: "Marina Alves",
  units: ["Unidade Teste", "Santana"],
  roles: [],
  professional: true,
};

/** A busca do controle "Sem resultado na busca". */
const NO_MATCH_Q = "laudo neurológico";

/** O conjunto de partida: a fixture do atalho, quando há, senão o mesmo conjunto sintético. */
const baseOf = (context: ScenarioContext): ReportsFixture => (context.data as ReportsFixture | undefined) ?? makeReportsFixture();

const focusOf = (s: ReportsState) => s.reports.find((r) => r.id === s.focusId);

/* ============================================================
   Lista
   ============================================================ */

function listModal(overlay: string | undefined, reports: Report[]): ReportsModal | null {
  if (overlay === "new") return { kind: "new" };
  if (overlay === "routine") return { kind: "routine" };
  if (overlay === "share") {
    const r = reports.find((x) => x.id === "r-123");
    return r && shareable(r) ? { kind: "share", id: r.id } : null;
  }
  return null;
}

function listSeed(base: ReportsFixture, c: Controls, prev?: ReportsState, changed?: string[]): ReportsState {
  if (prev && changed?.every((id) => id === "overlay" || id === "filter")) {
    return {
      ...prev,
      filters: changed.includes("filter") ? { ...prev.filters, late: c.filter === "late" } : prev.filters,
      modal: changed.includes("overlay") ? listModal(c.overlay, prev.reports) : prev.modal,
    };
  }
  const empty = c.rows === "empty";
  let data = { reports: empty ? [] : withSession(base.reports), routine: empty ? EMPTY_ROUTINE : base.routine };
  if (c.late === "none") data = withoutLate(data.reports, data.routine);
  return {
    ...data,
    modal: listModal(c.overlay, data.reports),
    filters: { ...EMPTY_FILTERS, late: c.filter === "late", q: c.rows === "no-match" ? NO_MATCH_Q : "" },
    version: (prev?.version ?? 0) + 1,
  };
}

function listDerive(s: ReportsState, c: Controls): Controls {
  const kind = s.modal?.kind;
  return {
    overlay: !kind ? "none" : kind === "new" || kind === "routine" || kind === "share" ? kind : c.overlay!,
    filter: s.filters.late ? "late" : "none",
    rows: s.reports.length === 0 ? c.rows! : s.filters.q.trim() === NO_MATCH_Q ? "no-match" : "data",
  };
}

function ListScreen({ context }: { context: ScenarioContext }) {
  const base = baseOf(context);
  const [state, setState] = useControlledState<ReportsState>(context, {
    groups: LIST_CONTROLS,
    seed: (c, prev, changed) => listSeed(base, c, prev, changed),
    derive: listDerive,
  });
  // "Voltar" das outras telas devolve a lista com os controles desta visita.
  useEffect(() => session.rememberList(context.controls), [context.controls]);

  return (
    <ReportsProvider context={context} patient={base.patient} state={state} setState={setState}>
      <ListFrame context={context} />
    </ReportsProvider>
  );
}

function ListFrame({ context }: { context: ScenarioContext }) {
  const { patient } = useReports();
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

export function PatientReportsList({ context }: ScreenProps) {
  if (context.isLoading) return null;
  return <ListScreen context={context} />;
}

/* ============================================================
   Relatório (modo foco)
   ============================================================ */

function reportModal(overlay: string | undefined, r: Report, viewAs: ViewAs): ReportsModal | null {
  const editable = viewAs === "coord" && (r.status === "solicitado" || r.status === "em_andamento");
  if (overlay === "edit" || overlay === "reassign" || overlay === "cancel") return editable ? { kind: overlay, id: r.id } : null;
  if (overlay === "share") return shareable(r) ? { kind: "share", id: r.id } : null;
  return null;
}

function ReportScreen({ context, reportId }: { context: ScenarioContext; reportId: string }) {
  const base = baseOf(context);
  const viewAs = relDefaultViewAs(context.persona?.id);
  const [state, setState] = useControlledState<ReportsState>(context, {
    groups: REPORT_CONTROLS,
    seed: (c, prev, changed) => {
      const current = prev && focusOf(prev);
      if (prev && current && changed?.every((id) => id === "overlay")) return { ...prev, modal: reportModal(c.overlay, current, viewAs) };
      const found = findReport(reportId, base.reports) ?? canonicalReport(c.status as ReportStatus);
      const r = reportFromControls(found, c);
      return {
        reports: [r], routine: base.routine, filters: EMPTY_FILTERS, focusId: r.id,
        modal: reportModal(c.overlay, r, viewAs), version: (prev?.version ?? 0) + 1,
      };
    },
    derive: (s, c) => {
      const r = focusOf(s);
      return r ? { ...deriveReport(r, c), overlay: s.modal?.kind ?? "none" } : c;
    },
  });

  return (
    <ReportsProvider context={context} patient={base.patient} state={state} setState={setState}>
      <FocusFrame>{focusOf(state) && <ReportView report={focusOf(state)!} />}</FocusFrame>
    </ReportsProvider>
  );
}

export function PatientReport({ context, params }: ScreenProps) {
  if (context.isLoading) return null;
  const reportId = params.reportId ?? "";
  return <ReportScreen key={reportId} context={context} reportId={reportId} />;
}

/* ============================================================
   Editores: modelo, protocolo e anexar PDF
   ============================================================ */

const EDITOR_GROUPS = { fill: FILL_CONTROLS, protocol: PROTOCOL_CONTROLS, upload: UPLOAD_CONTROLS };

function EditorScreen({ context, reportId, kind }: { context: ScenarioContext; reportId: string; kind: EditorKind }) {
  const base = baseOf(context);
  const [state, setState] = useControlledState<ReportsState>(context, {
    groups: EDITOR_GROUPS[kind],
    seed: (c, prev) => {
      const found = findReport(reportId, base.reports);
      const r = editorFromControls(kind, found && editorKindOf(found) === kind ? found : editorCanonical(kind), c);
      return { reports: [r], routine: base.routine, filters: EMPTY_FILTERS, focusId: r.id, modal: null, version: (prev?.version ?? 0) + 1 };
    },
    derive: (s, c) => {
      const r = focusOf(s);
      return r ? deriveEditor(kind, r) : c;
    },
  });
  const r = focusOf(state);

  return (
    <ReportsProvider context={context} patient={base.patient} state={state} setState={setState}>
      <FocusFrame>{r && (kind === "upload" ? <UploadEditor key={state.version} report={r} /> : <FillEditor key={state.version} report={r} />)}</FocusFrame>
    </ReportsProvider>
  );
}

function editorScreen(kind: EditorKind) {
  return function PatientReportEditor({ context, params }: ScreenProps) {
    if (context.isLoading) return null;
    const reportId = params.reportId ?? "";
    return <EditorScreen key={reportId} context={context} reportId={reportId} kind={kind} />;
  };
}

export const PatientReportFill = editorScreen("fill");
export const PatientReportProtocol = editorScreen("protocol");
export const PatientReportUpload = editorScreen("upload");

/** Modo foco: a view ocupa a página, com os modais e os toasts. */
function FocusFrame({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ModalHost />
      <ToastWrapper />
    </>
  );
}
