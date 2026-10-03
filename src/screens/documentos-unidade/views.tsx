/**
 * Documentos da unidade — a gaveta ativa.
 * Monta só quando aberta, para o formulário começar limpo.
 */
import { BundleModal } from "./BundleModal.js";
import { DocumentDrawer } from "./DocumentDrawer.js";
import { useUnitDocuments } from "./store.js";

export function ModalHost() {
  const { modal, get, canEdit } = useUnitDocuments();
  if (!modal) return null;
  if (modal.kind === "bundle") return <BundleModal />;
  if (!canEdit) return null;
  if (modal.kind === "add") return <DocumentDrawer />;
  if (modal.kind === "attach") return <DocumentDrawer key={modal.slotId} preset={modal.slotId} />;
  const doc = get(modal.id);
  return doc ? <DocumentDrawer key={doc.id} doc={doc} /> : null;
}
