/**
 * Gaveta "Exportar agrupado" da unidade (`DocBundleModal`, que no protótipo é
 * modal; aqui é gaveta, como na aba do profissional): junta os documentos
 * escolhidos num PDF só, na ordem da lista. Documento sem arquivo não entra.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import { buildRows, docState, pluralize, type UnitDocument } from "./model.js";
import { DRAWER_SIZE, DocStatusTag, DrawerFooter, validityText } from "./parts.js";
import { useUnitDocuments } from "./store.js";

export function BundleModal() {
  const { unit, documents, closeModal, exportBundle } = useUnitDocuments();
  // Na ordem da lista: padrão primeiro, depois os adicionais.
  const ordered = buildRows(documents)
    .map((r) => r.doc)
    .filter((d): d is UnitDocument => Boolean(d));
  const [sel, setSel] = useState<string[]>(() => ordered.filter((d) => d.file).map((d) => d.id));
  const toggle = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const chosen = ordered.filter((d) => sel.includes(d.id));
  const alerts = chosen.filter((d) => ["expiring", "expired"].includes(docState(d).key)).length;

  return (
    <DrawerModal
      id="documentos-unidade-exportar"
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
            <Icon name="fa-hospital" type="solid" />
          </span>
          <div>
            <p className="font-extrabold text-brand-purple-dark">{unit.name}</p>
            <p className="text-sm text-brand-purple-dark/60">
              {`${pluralize(documents.length, "documento cadastrado", "documentos cadastrados")} · ${unit.header.address.city}`}
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm/4 font-bold text-brand-blue">Documentos no PDF</p>

        <div className="mt-3 flex flex-col gap-2">
          {ordered.length === 0 && <p className="py-6 text-center text-brand-purple-dark/40">Nenhum documento cadastrado.</p>}
          {ordered.map((d) => {
            const on = sel.includes(d.id);
            return (
              <div
                key={d.id}
                className={[
                  "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                  on ? "border-brand-blue/40 bg-brand-blue/10" : "border-brand-purple-dark/10 bg-white",
                  !d.file && "opacity-60",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Input
                  id={`exportar-unidade-${d.id}`}
                  name={`exportar[${d.id}]`}
                  type="checkbox"
                  aria-label={d.name}
                  checked={on}
                  disabled={!d.file}
                  onChange={() => toggle(d.id)}
                />
                <label htmlFor={`exportar-unidade-${d.id}`} className={["min-w-0 flex-1", d.file ? "cursor-pointer" : "cursor-not-allowed"].join(" ")}>
                  <span className="block font-bold text-brand-purple-dark">{d.name}</span>
                  <span className="block text-sm text-brand-purple-dark/60">
                    {d.file ? `${validityText(d)} · ${d.file}` : "sem arquivo anexado — não entra no PDF"}
                  </span>
                </label>
                <DocStatusTag doc={d} />
              </div>
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
