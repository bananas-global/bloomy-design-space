/**
 * Gaveta "Exportar agrupado" (`DocBundleModal`, que no protótipo é modal): junta os documentos escolhidos
 * num PDF só, na ordem da lista. Documento sem arquivo não entra.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { DrawerModal } from "../../components/Overlay.js";
import { docState, pluralize } from "./model.js";
import { DRAWER_SIZE, DocStatusTag, DrawerFooter, docMeta } from "./parts.js";
import { useDocuments } from "./store.js";

export function BundleModal() {
  const { professional, documents, closeModal, exportBundle } = useDocuments();
  const withFile = documents.filter((d) => d.file);
  const [sel, setSel] = useState<string[]>(() => withFile.map((d) => d.id));
  const toggle = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const chosen = documents.filter((d) => sel.includes(d.id));
  const alerts = chosen.filter((d) => ["expiring", "expired"].includes(docState(d).key)).length;

  return (
    <DrawerModal
      id="documentos-exportar"
      show
      onCancel={closeModal}
      variant="custom"
      customSize={DRAWER_SIZE}
      contentClass="flex flex-col"
      title="Exportar agrupado"
    >
      <div className="flex-1">
        <div className="flex items-center gap-3 rounded-xl bg-brand-purple-dark/5 p-4">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-blue/16 text-brand-blue-dark">
            <Icon name="fa-user-md" type="solid" />
          </span>
          <div>
            <p className="font-extrabold text-brand-purple-dark">{professional.name}</p>
            <p className="text-sm text-brand-purple-dark/60">{`${pluralize(documents.length, "documento cadastrado", "documentos cadastrados")}`}</p>
          </div>
        </div>

        <p className="mt-6 text-sm/4 font-bold text-brand-blue">Documentos no PDF</p>

        <div className="mt-3 flex flex-col gap-2">
          {documents.length === 0 && <p className="py-6 text-center text-brand-purple-dark/40">Nenhum documento cadastrado.</p>}
          {documents.map((d) => {
            const on = sel.includes(d.id);
            return (
              <label
                key={d.id}
                htmlFor={`exportar-${d.id}`}
                className={[
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                  on ? "border-brand-blue/40 bg-brand-blue/10" : "border-brand-purple-dark/10 bg-white",
                  !d.file && "cursor-not-allowed opacity-60",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  id={`exportar-${d.id}`}
                  type="checkbox"
                  checked={on}
                  disabled={!d.file}
                  onChange={() => toggle(d.id)}
                  className="rounded border-neutral-100 text-brand-blue focus:ring-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-brand-purple-dark">{d.name}</span>
                  <span className="block text-sm text-brand-purple-dark/60">
                    {d.file ? `${docMeta(d)} · ${d.file}` : "sem arquivo anexado — não entra no PDF"}
                  </span>
                </span>
                <DocStatusTag doc={d} />
              </label>
            );
          })}
        </div>
      </div>

      <DrawerFooter>
        <p className="mr-auto self-center text-sm text-brand-purple-dark/70">
          {chosen.length === 0 ? (
            "Selecione ao menos um documento."
          ) : (
            <>
              <strong className="text-brand-purple-dark">{chosen.length}</strong>
              {` ${chosen.length === 1 ? "documento" : "documentos"} em 1 PDF`}
              {alerts > 0 && <span className="font-bold text-orange-dark">{` · ${alerts} vencido${alerts > 1 ? "s" : ""} ou a vencer`}</span>}
            </>
          )}
        </p>
        <Button type="button" variant="tint" onClick={closeModal}>
          Cancelar
        </Button>
        <Button type="button" rightIcon="fa-file-pdf" disabled={chosen.length === 0} className="disabled:opacity-50" onClick={() => exportBundle(sel)}>
          Exportar PDF
        </Button>
      </DrawerFooter>
    </DrawerModal>
  );
}
