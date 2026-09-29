/**
 * Relatórios do paciente — registro das views de página cheia e dos modais.
 *
 * Cada `kind` de `ReportsView` (menos "list") e de `ReportsModal` aponta para um
 * componente. Uma etapa nova troca o placeholder pelo componente dela aqui; o
 * componente recebe o relatório já resolvido e usa `useReports()` para o resto.
 */
import type { ComponentType } from "react";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { EmptyStateCard } from "../../components/Layout.js";
import { relTypeName, type Report } from "./model.js";
import { EditRequestDrawer } from "./EditRequestDrawer.js";
import { NewRequestDrawer } from "./NewRequestDrawer.js";
import { ReportView } from "./ReportView.js";
import { CancelModal, ReassignModal } from "./RequestModals.js";
import { RoutineDrawer } from "./RoutineDrawer.js";
import { ShareModal } from "./Share.js";
import { useReports, type ReportsModal, type ReportsView } from "./store.js";

export type ReportViewProps = { report: Report };
export type ReportModalProps = { report: Report };

type FocusKind = Exclude<ReportsView["kind"], "list">;
type ReportModalKind = Extract<ReportsModal, { id: string }>["kind"];

/**
 * Placeholder de view ainda não construída. Novo — não existe no Phoenix.
 * Página cheia (modo foco) com "Voltar" para a lista.
 */
function PendingView({ report, what }: ReportViewProps & { what: string }) {
  const { toList } = useReports();
  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <Button type="button" variant="tint" leftIcon="fa-arrow-left" iconType="solid" onClick={toList}>
        Voltar para relatórios
      </Button>
      <Card className="mt-6">
        <EmptyStateCard icon="fa-person-digging" text={`${what}: ${relTypeName(report)}`}>
          <p>{`Esta view (${report.period || report.id}) entra numa próxima etapa do porte.`}</p>
        </EmptyStateCard>
      </Card>
    </div>
  );
}

/** Views de página cheia por `kind`. */
export const VIEWS: Record<FocusKind, ComponentType<ReportViewProps>> = {
  report: ReportView,
  fill: (props) => <PendingView {...props} what="Preencher relatório" />,
  upload: (props) => <PendingView {...props} what="Anexar documento" />,
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
