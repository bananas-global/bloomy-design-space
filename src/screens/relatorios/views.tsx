/**
 * Relatórios do paciente — registro dos modais.
 *
 * Cada `kind` de `ReportsModal` aponta para um componente, que recebe o
 * relatório já resolvido e usa `useReports()` para o resto.
 */
import type { ComponentType } from "react";
import type { Report } from "./model.js";
import { EditRequestDrawer } from "./EditRequestDrawer.js";
import { NewRequestDrawer } from "./NewRequestDrawer.js";
import { CancelModal, ReassignModal } from "./RequestModals.js";
import { RoutineDrawer } from "./RoutineDrawer.js";
import { ShareModal } from "./Share.js";
import { useReports, type ReportsModal } from "./store.js";

export type ReportModalProps = { report: Report };

type ReportModalKind = Extract<ReportsModal, { id: string }>["kind"];

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
