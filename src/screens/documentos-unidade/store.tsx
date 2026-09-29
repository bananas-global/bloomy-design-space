/**
 * Documentos da unidade — estado da tela (provider React).
 *
 * A tela monta o `UnitDocumentsState` a partir dos controles
 * (`useControlledState` de `./flow.ts`) e o entrega a `UnitDocumentsProvider`,
 * que expõe as ações do protótipo por `useUnitDocuments()`: filtrar, trocar a
 * visualização, abrir as gavetas, salvar um documento e exportar o PDF
 * agrupado. Vive só em memória: recarregar a página volta aos controles.
 */
import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import { showToast, type ToastType } from "../../components/Action.js";
import type { DocumentsUnit } from "./fixtures.js";
import { TODAY_BR, pluralize, type DocFilters, type UnitDocTypeId, type UnitDocument } from "./model.js";

export type DocumentsView = "cards" | "table";

export type DocumentsModal =
  | { kind: "add" }
  | { kind: "attach"; slotId: string }
  | { kind: "edit"; id: string }
  | { kind: "bundle" };

export type UnitDocumentsState = {
  /** A unidade que os dados representam (o controle "Unidade"). */
  unitId: string;
  documents: UnitDocument[];
  filters: DocFilters;
  view: DocumentsView;
  modal: DocumentsModal | null;
};

/** O que a gaveta de adicionar/editar entrega. */
export type DocumentData = {
  slotId?: string;
  type: UnitDocTypeId;
  name: string;
  validFrom: string | null;
  validUntil: string | null;
  file: string;
  sharedWith: string[];
};

export type UnitDocumentsStore = {
  unit: DocumentsUnit;
  documents: UnitDocument[];
  get: (id: string) => UnitDocument | undefined;
  /** `units.edit`: adicionar, anexar e editar. */
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
  /** Gera o PDF agrupado com os documentos escolhidos; fecha a gaveta. */
  exportBundle: (ids: string[]) => void;
};

const Ctx = createContext<UnitDocumentsStore | null>(null);

export function useUnitDocuments(): UnitDocumentsStore {
  const store = useContext(Ctx);
  if (!store) throw new Error("useUnitDocuments precisa de <UnitDocumentsProvider>.");
  return store;
}

type ProviderProps = {
  context: ScenarioContext;
  unit: DocumentsUnit;
  /** Quem salva o documento (o `user` do `unit_document`). */
  userName: string;
  state: UnitDocumentsState;
  setState: (next: (prev: UnitDocumentsState) => UnitDocumentsState) => void;
  children: ReactNode;
};

let seq = 0;

export function UnitDocumentsProvider({ context, unit, userName, state, setState, children }: ProviderProps) {
  const canEdit = context.can("units.edit");
  const latest = useRef(state);
  latest.current = state;

  const store = useMemo<UnitDocumentsStore>(() => {
    const toast = (type: ToastType, title: string, content: string) => showToast({ type, title, content, closeTime: 4000 });
    const closeModal = () => setState((s) => ({ ...s, modal: null }));

    return {
      unit,
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

      save: (id, data) => {
        const base = id ? latest.current.documents.find((d) => d.id === id) : undefined;
        const next: UnitDocument = { id: base?.id ?? `${unit.id}_n${++seq}`, responsible: userName, updatedAt: TODAY_BR, ...data };
        setState((s) => ({
          ...s,
          modal: null,
          documents: base ? s.documents.map((d) => (d.id === base.id ? next : d)) : [...s.documents, next],
        }));
        toast("success", base ? "Documento atualizado" : "Documento adicionado", `${next.name} · ${unit.name}`);
      },

      exportBundle: (ids) => {
        closeModal();
        toast("success", "Exportando agrupado", `${unit.name} · 1 PDF com ${pluralize(ids.length, "documento", "documentos")}, na ordem da lista.`);
      },
    };
  }, [state, canEdit, unit, userName, setState]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
