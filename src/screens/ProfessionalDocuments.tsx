/**
 * Documentos do profissional (v2) — substitui a aba Documentos da ficha do
 * profissional (`professionals/components/edit_tabs/documents.ex`).
 *
 * A moldura do backoffice com a ficha do profissional e a aba Documentos:
 * documentos padrão (mesmo sem arquivo), adicionais, visão em cards ou tabela,
 * a gaveta de adicionar/anexar/editar com o compartilhamento com as operadoras
 * e o PDF agrupado.
 *
 * A tela monta os dados a partir dos controles (`documentos/flow.ts`) sobre o
 * conjunto da Helena (`documentos/fixtures.ts`).
 */
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { ProfessionalLayout } from "../layouts/ProfessionalLayout.js";
import { DocumentsTab } from "./documentos/DocumentsTab.js";
import { alertDocuments, makeDocumentsFixture, type DocumentsFixture } from "./documentos/fixtures.js";
import { DOCUMENTS_CONTROLS, useControlledState, type Controls } from "./documentos/flow.js";
import { EMPTY_FILTERS, docState, type ProfessionalDocument } from "./documentos/model.js";
import { DocumentsProvider, type DocumentsModal, type DocumentsState } from "./documentos/store.js";
import { ModalHost } from "./documentos/views.js";

const CURRENT_USER = {
  name: "Marina Alves",
  units: ["Unidade Teste", "Santana"],
  roles: [],
  professional: true,
};

/** A busca do controle "Sem resultado na busca". */
const NO_MATCH_Q = "certidão de antecedentes";

/** O documento que cada sobreposição de edição abre. */
const EDIT_DOC = { edit: "p1_d2", "edit-aba": "p1_aba1" } as const;
/** A lacuna padrão que "Anexar documento padrão" abre. */
const ATTACH_TYPE = "council_card";

const baseOf = (context: ScenarioContext): DocumentsFixture => (context.data as DocumentsFixture | undefined) ?? makeDocumentsFixture();

function modalOf(overlay: string | undefined, documents: ProfessionalDocument[]): DocumentsModal | null {
  if (overlay === "add") return { kind: "add" };
  if (overlay === "bundle") return { kind: "bundle" };
  if (overlay === "attach") return documents.some((d) => d.typeId === ATTACH_TYPE) ? null : { kind: "attach", typeId: ATTACH_TYPE };
  if (overlay === "edit" || overlay === "edit-aba") {
    const id = EDIT_DOC[overlay];
    return documents.some((d) => d.id === id) ? { kind: "edit", id } : null;
  }
  return null;
}

function seed(base: DocumentsFixture, c: Controls, prev?: DocumentsState, changed?: string[]): DocumentsState {
  if (prev && changed?.every((id) => id === "overlay" || id === "view")) {
    return {
      ...prev,
      view: c.view === "table" ? "table" : "cards",
      modal: changed.includes("overlay") ? modalOf(c.overlay, prev.documents) : prev.modal,
    };
  }
  const alertIds = new Set(alertDocuments().map((d) => d.id));
  const documents = c.rows === "empty" ? [] : base.documents.filter((d) => c.alerts !== "none" || !alertIds.has(d.id));
  return {
    documents,
    view: c.view === "table" ? "table" : "cards",
    filters: { ...EMPTY_FILTERS, name: c.rows === "no-match" ? NO_MATCH_Q : "" },
    modal: modalOf(c.overlay, documents),
  };
}

function derive(s: DocumentsState, c: Controls): Controls {
  const m = s.modal;
  let overlay = "none";
  if (m?.kind === "add" || m?.kind === "bundle") overlay = m.kind;
  else if (m?.kind === "attach") overlay = "attach";
  else if (m?.kind === "edit") overlay = s.documents.find((d) => d.id === m.id)?.typeId === "aba_course" ? "edit-aba" : "edit";

  const empty = s.documents.length === 0;
  const alerting = s.documents.some((d) => ["expiring", "expired"].includes(docState(d).key));
  return {
    view: s.view,
    overlay,
    rows: empty ? "empty" : s.filters.name.trim() === NO_MATCH_Q ? "no-match" : "data",
    alerts: empty ? c.alerts! : alerting ? "with" : "none",
  };
}

function DocumentsScreen({ context }: { context: ScenarioContext }) {
  const base = baseOf(context);
  const [state, setState] = useControlledState<DocumentsState>(context, {
    groups: DOCUMENTS_CONTROLS,
    seed: (c, prev, changed) => seed(base, c, prev, changed),
    derive,
  });
  const professional = base.professional;

  return (
    <DocumentsProvider context={context} professional={professional} state={state} setState={setState}>
      <BackofficeLayout
        context={context}
        currentPath={`/backoffice/profissionais/${professional.id}`}
        breadcrumbs={[{ label: "Profissionais", to: "/backoffice/profissionais" }, { label: professional.name }]}
        currentUser={CURRENT_USER}
        currentUnit="Unidade Teste"
      >
        <ProfessionalLayout
          context={context}
          professional={professional.header}
          activeTab="documents"
          renderTab={(tab) => (tab === "documents" ? <DocumentsTab /> : null)}
        />
        <ModalHost />
      </BackofficeLayout>
    </DocumentsProvider>
  );
}

export function ProfessionalDocuments({ context }: ScreenProps) {
  if (context.isLoading) return null;
  return <DocumentsScreen context={context} />;
}

