/**
 * Relatórios do paciente — registro das views de página cheia e dos modais.
 *
 * Cada `kind` de `ReportsView` (menos "list") e de `ReportsModal` aponta para um
 * componente. Uma etapa nova registra o componente dela aqui; o
 * componente recebe o relatório já resolvido e usa `useReports()` para o resto.
 */
import type { ComponentType } from "react";
import type { Report } from "./model.js";
import { EditRequestDrawer } from "./EditRequestDrawer.js";
import { FillEditor } from "./FillEditor.js";
import { NewRequestDrawer } from "./NewRequestDrawer.js";
import { ReportView } from "./ReportView.js";
import { CancelModal, ReassignModal } from "./RequestModals.js";
import { RoutineDrawer } from "./RoutineDrawer.js";
import { ShareModal } from "./Share.js";
import { UploadEditor } from "./UploadEditor.js";
import { useReports, type ReportsModal, type ReportsView } from "./store.js";

export type ReportViewProps = { report: Report };
export type ReportModalProps = { report: Report };

type FocusKind = Exclude<ReportsView["kind"], "list">;
type ReportModalKind = Extract<ReportsModal, { id: string }>["kind"];

/** Views de página cheia por `kind`. */
export const VIEWS: Record<FocusKind, ComponentType<ReportViewProps>> = {
  report: ReportView,
  fill: FillEditor,
  upload: UploadEditor,
};

/** Modais que dependem de um relatório, por `kind`. */
export const MODALS: Record<ReportModalKind, ComponentType<ReportModalProps>> = {
  reassign: ReassignModal,
  cancel: CancelModal,
  share: function ShareEntry({ report }) {
    const { closeModal } = useReports();
    return <ShareModal report={report} onClose={closeModal} />;
  },
  edit: EditRequestDrawer,
};

/** A view ativa (fora da lista). */
export function FocusView() {
  const { view, get } = useReports();
  if (view.kind === "list") return null;
  const report = get(view.id);
  if (!report) return null;
  const View = VIEWS[view.kind];
  return <View report={report} />;
}

/** O modal ativo. Monta só quando aberto, para o formulário começar limpo. */
export function ModalHost() {
  const { modal, get } = useReports();
  if (!modal) return null;
  if (modal.kind === "new") return <NewRequestDrawer show />;
  if (modal.kind === "routine") return <RoutineDrawer />;
  const report = get(modal.id);
  if (!report) return null;
  const M = MODALS[modal.kind];
  return <M report={report} />;
}
