/**
 * Documentos da unidade — substitui a aba Documentos da unidade
 * (`unit_live/components/unit_documents.ex`), no mesmo desenho da aba do
 * profissional.
 *
 * A moldura do backoffice com a ficha da unidade e a aba Documentos:
 * documentos padrão (mesmo sem arquivo), adicionais, visão em cards ou tabela,
 * a gaveta de adicionar/anexar/editar com o compartilhamento com as operadoras
 * e o PDF agrupado.
 *
 * A tela monta os dados a partir dos controles (`documentos-unidade/flow.ts`)
 * sobre as duas unidades do protótipo (`documentos-unidade/fixtures.ts`).
 */
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { UnitLayout } from "../layouts/UnitLayout.js";
import { DocumentsTab } from "./documentos-unidade/DocumentsTab.js";
import { UNITS, unitById, unitDocuments, type UnitDocumentsFixture, type UnitId } from "./documentos-unidade/fixtures.js";
import { UNIT_DOCUMENTS_CONTROLS, useControlledState, type Controls } from "./documentos-unidade/flow.js";
import { EMPTY_FILTERS, STANDARD, docState, type UnitDocument } from "./documentos-unidade/model.js";
import { UnitDocumentsProvider, type DocumentsModal, type UnitDocumentsState } from "./documentos-unidade/store.js";
import { ModalHost } from "./documentos-unidade/views.js";

const CURRENT_USER = {
  name: "Marcus Vinícius Gimenes",
  units: UNITS.map((u) => u.name),
  roles: [],
  professional: false,
};

/** A busca do controle "Sem resultado na busca". */
const NO_MATCH_Q = "habite-se";

/** O documento padrão que "Editar documento" abre. */
const EDIT_SLOT = "alvara";

const unitsOf = (context: ScenarioContext) => (context.data as UnitDocumentsFixture | undefined)?.units ?? UNITS;

function modalOf(overlay: string | undefined, documents: UnitDocument[]): DocumentsModal | null {
  if (overlay === "add") return { kind: "add" };
  if (overlay === "bundle") return { kind: "bundle" };
  if (overlay === "attach") {
    const pending = STANDARD.find((s) => !documents.some((d) => d.slotId === s.id));
    return pending ? { kind: "attach", slotId: pending.id } : null;
  }
  if (overlay === "edit") {
    const doc = documents.find((d) => d.slotId === EDIT_SLOT);
    return doc ? { kind: "edit", id: doc.id } : null;
  }
  return null;
}

function seed(c: Controls, prev?: UnitDocumentsState, changed?: string[]): UnitDocumentsState {
  if (prev && changed?.every((id) => id === "overlay" || id === "view")) {
    return {
      ...prev,
      view: c.view === "table" ? "table" : "cards",
      modal: changed.includes("overlay") ? modalOf(c.overlay, prev.documents) : prev.modal,
    };
  }
  const unitId: UnitId = c.unit === "u2" ? "u2" : "u1";
  const documents = c.rows === "empty" ? [] : unitDocuments(unitId, c.alerts !== "none");
  return {
    unitId,
    documents,
    view: c.view === "table" ? "table" : "cards",
    filters: { ...EMPTY_FILTERS, name: c.rows === "no-match" ? NO_MATCH_Q : "" },
    modal: modalOf(c.overlay, documents),
  };
}

function derive(s: UnitDocumentsState, c: Controls): Controls {
  const empty = s.documents.length === 0;
  const alerting = s.documents.some((d) => ["expiring", "expired"].includes(docState(d).key));
  return {
    unit: s.unitId,
    view: s.view,
    overlay: s.modal?.kind ?? "none",
    rows: empty ? "empty" : s.filters.name.trim() === NO_MATCH_Q ? "no-match" : "data",
    alerts: empty ? c.alerts! : alerting ? "with" : "none",
  };
}

function DocumentsScreen({ context }: { context: ScenarioContext }) {
  const [state, setState] = useControlledState<UnitDocumentsState>(context, {
    groups: UNIT_DOCUMENTS_CONTROLS,
    seed,
    derive,
  });
  const units = unitsOf(context);
  const unit = units.find((u) => u.id === state.unitId) ?? unitById(state.unitId);

  return (
    <UnitDocumentsProvider context={context} unit={unit} userName={CURRENT_USER.name} state={state} setState={setState}>
      <BackofficeLayout
        context={context}
        currentPath="/backoffice/unidades"
        breadcrumbs={[{ label: "Unidades", to: "/backoffice/unidades" }, { label: unit.name }]}
        currentUser={CURRENT_USER}
        currentUnit={unit.name}
      >
        <UnitLayout
          key={unit.id}
          context={context}
          unit={unit.header}
          activeTab="documents"
          renderTab={(tab) => (tab === "documents" ? <DocumentsTab /> : null)}
        />
        <ModalHost />
      </BackofficeLayout>
    </UnitDocumentsProvider>
  );
}

export function UnitDocuments({ context }: ScreenProps) {
  if (context.isLoading) return null;
  return <DocumentsScreen context={context} />;
}
