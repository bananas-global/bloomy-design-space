/**
 * Documentos do profissional — o modal ativo.
 * Monta só quando aberto, para o formulário começar limpo.
 */
import { BundleModal } from "./BundleModal.js";
import { DocumentDrawer } from "./DocumentDrawer.js";
import { useDocuments } from "./store.js";

export function ModalHost() {
  const { modal, get, canEdit } = useDocuments();
  if (!modal) return null;
  if (modal.kind === "bundle") return <BundleModal />;
  if (!canEdit) return null;
  if (modal.kind === "add") return <DocumentDrawer />;
  if (modal.kind === "attach") return <DocumentDrawer preset={modal.typeId} />;
  const doc = get(modal.id);
  return doc ? <DocumentDrawer key={doc.id} doc={doc} /> : null;
}
