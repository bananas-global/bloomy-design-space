/**
 * Documentos do profissional — estado da tela (provider React).
 *
 * A tela monta o próprio `DocumentsState` a partir dos controles
 * (`useControlledState` de `./flow.ts`) e o entrega a `DocumentsProvider`, que
 * expõe as ações do protótipo por `useDocuments()`: filtrar, trocar a
 * visualização, abrir as gavetas, salvar um documento e exportar o PDF
 * agrupado. Vive só em memória: recarregar a página volta aos controles.
 */
import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import { showToast, type ToastType } from "../../components/Action.js";
import type { DocumentsProfessional } from "./fixtures.js";
import { TODAY_BR, pluralize, type DocFilters, type DocTypeId, type ProfessionalDocument } from "./model.js";

export type DocumentsView = "cards" | "table";

export type DocumentsModal =
  | { kind: "add" }
  | { kind: "attach"; typeId: DocTypeId }
  | { kind: "edit"; id: string }
  | { kind: "bundle" };

export type DocumentsState = {
  documents: ProfessionalDocument[];
  filters: DocFilters;
  view: DocumentsView;
  modal: DocumentsModal | null;
};

/** O que a gaveta de adicionar/editar entrega. */
export type DocumentData = {
  typeId: DocTypeId;
  name: string;
  training?: string;
  hours?: number;
  validUntil: string | null;
  file: string;
  sharedWith: string[];
};

export type DocumentsStore = {
  professional: DocumentsProfessional;
  documents: ProfessionalDocument[];
  get: (id: string) => ProfessionalDocument | undefined;
  /** `professionals.edit`: adicionar, anexar e editar. */
  canEdit: boolean;
  filters: DocFilters;
  setFilters: (next: DocFilters) => void;
  view: DocumentsView;
  setView: (view: DocumentsView) => void;
  modal: DocumentsModal | null;
  openModal: (modal: DocumentsModal) => void;
  closeModal: () => void;
  /** Adiciona (sem `id`) ou atualiza um documento; fecha a gaveta. */
  save: (id: string | null, data: DocumentData) => void;
  /** Gera o PDF agrupado com os documentos escolhidos; fecha o modal. */
  exportBundle: (ids: string[]) => void;
  toast: (type: ToastType, title: string, content: string) => void;
};

const Ctx = createContext<DocumentsStore | null>(null);

export function useDocuments(): DocumentsStore {
  const store = useContext(Ctx);
  if (!store) throw new Error("useDocuments precisa de <DocumentsProvider>.");
  return store;
}

type ProviderProps = {
  context: ScenarioContext;
  professional: DocumentsProfessional;
  state: DocumentsState;
  setState: (next: (prev: DocumentsState) => DocumentsState) => void;
  children: ReactNode;
};

let seq = 0;

export function DocumentsProvider({ context, professional, state, setState, children }: ProviderProps) {
  const canEdit = context.can("professionals.edit");
  const latest = useRef(state);
  latest.current = state;

  const store = useMemo<DocumentsStore>(() => {
    const toast = (type: ToastType, title: string, content: string) => showToast({ type, title, content, closeTime: 4000 });
    const closeModal = () => setState((s) => ({ ...s, modal: null }));

    return {
      professional,
      documents: state.documents,
      get: (id) => latest.current.documents.find((d) => d.id === id),
      canEdit,
      filters: state.filters,
      setFilters: (filters) => setState((s) => ({ ...s, filters })),
      view: state.view,
      setView: (view) => setState((s) => ({ ...s, view })),
      modal: state.modal,
      openModal: (modal) => setState((s) => ({ ...s, modal })),
      closeModal,
      toast,

      save: (id, data) => {
        const base = id ? latest.current.documents.find((d) => d.id === id) : undefined;
        const next: ProfessionalDocument = {
          id: base?.id ?? `${professional.id}_n${++seq}`,
          number: base?.number ?? "",
          updatedAt: TODAY_BR,
          ...data,
        };
        setState((s) => ({
          ...s,
          modal: null,
          documents: base ? s.documents.map((d) => (d.id === base.id ? next : d)) : [...s.documents, next],
        }));
        toast("success", base ? "Documento atualizado" : "Documento adicionado", `${next.name} · ${professional.name}`);
      },

      exportBundle: (ids) => {
        closeModal();
        toast("success", "Exportando agrupado", `${professional.name} · 1 PDF com ${pluralize(ids.length, "documento", "documentos")}, na ordem da lista.`);
      },
    };
  }, [state, canEdit, professional, setState]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
