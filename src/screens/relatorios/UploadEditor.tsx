/**
 * Anexar documento em modo foco (tela Anexar PDF, `RfUploadEditor` de
 * `relatorios-foco.jsx`). Para tipos sem modelo interno ("Outro" e "Relatório
 * Externo"): o documento final é produzido fora do sistema e anexado aqui.
 * A área de envio é o `FileUploader` (variant `simplified`) do catálogo; o
 * rascunho guarda `{ file, obs }` em `draftContent`, e "Finalizar relatório"
 * chama `finalizeUpload`.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/Button.js";
import { FileUploader, type UploadEntry } from "../../components/FileUploader.js";
import { Input } from "../../components/Input.js";
import { EditorPage, SaveDraftButton, useDraft, useStartReport } from "./FillEditor.js";
import { DocEmpty, FileRow, FocusFootStatus, type FileLike } from "./Focus.js";
import { REL_REQUESTED_BY_SHORT, relStamp, type Report } from "./model.js";
import { Callout, FieldBlock } from "./parts.js";
import { useReports } from "./store.js";

type FinalFile = FileLike & { name: string; size: string; at: string };

const MAX_MB = 20;
const sizeText = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.round(b / 1024)} KB`);

export function UploadEditor({ report: r }: { report: Report }) {
  const { toReport, viewAs, me, finalizeUpload } = useReports();
  const init = r.draftContent ?? {};
  const [file, setFile] = useState<FinalFile | null>(() => (init.file as FinalFile | undefined) ?? (r.finalDoc ? { ...r.finalDoc, kind: "PDF anexado" } : null));
  const [obs, setObs] = useState(String(init.obs ?? ""));
  const [uploading, setUploading] = useState<UploadEntry | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const save = useDraft(r, { file: file ?? undefined, obs: obs || undefined });
  useStartReport(r, "Solicitação aberta");
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);
  const back = () => toReport(r.id);

  /** Envio simulado: a barra do `FileUploader` sobe de 20 em 20% e o arquivo vira o documento final. */
  function pick(files: File[]) {
    const f = files[0];
    if (!f) return;
    const errors: UploadEntry["errors"] = [];
    if (!f.name.toLowerCase().endsWith(".pdf")) errors.push("not_accepted");
    if (f.size > MAX_MB * 1048576) errors.push("too_large");
    const entry: UploadEntry = { ref: "0", clientName: f.name, clientSize: f.size, progress: 0, done: false, errors };
    setUploading(entry);
    if (errors.length) return;
    const final: FinalFile = { name: f.name, size: sizeText(f.size), at: relStamp().split(" ")[0]!, by: viewAs === "coord" ? REL_REQUESTED_BY_SHORT : me, kind: "PDF anexado" };
    let p = 0;
    timer.current = setInterval(() => {
      p += 20;
      setUploading({ ...entry, progress: p });
      if (p >= 100) {
        if (timer.current) clearInterval(timer.current);
        setUploading(null);
        setFile(final);
      }
    }, 120);
  }

  return (
    <EditorPage
      report={r}
      save={save}
      onBack={back}
      preview={
        file ? (
          <div className="flex flex-col gap-3">
            <FileRow file={file} tone="final" />
            <p className="text-[13px] text-brand-purple-dark/40 italic">Pré-visualização do PDF anexado (demo).</p>
          </div>
        ) : (
          <DocEmpty icon="fa-file-arrow-up" title="Nenhum PDF anexado" text="Anexe o documento final para visualizá-lo aqui." />
        )
      }
      foot={
        <>
          <FocusFootStatus icon={file ? "fa-circle-check" : "fa-circle-exclamation"} iconClass={file ? "text-green" : "text-orange"}>
            {file ? "PDF final pronto para finalizar" : "Anexe o PDF final para poder finalizar"}
          </FocusFootStatus>
          <div className="flex flex-wrap gap-3">
            <SaveDraftButton save={save} title="Salvo" toastText="Você pode finalizar depois." />
            <Button
              type="button"
              color="green"
              rightIcon="fa-circle-check"
              iconType="solid"
              disabled={!file}
              className="disabled:opacity-50"
              onClick={() => {
                if (!file) return;
                finalizeUpload(r.id, file, obs.trim());
                back();
              }}
            >
              Finalizar relatório
            </Button>
          </div>
        </>
      }
    >
      <Callout tone="info" icon="fa-circle-info">
        Este tipo <strong>não abre modelo interno</strong>. Faça o upload do documento final produzido fora do sistema.
      </Callout>
      <FieldBlock label="Documento final" hint="o relatório concluído — distinto dos arquivos de apoio">
        {file ? (
          <FileRow file={file} tone="final" onRemove={() => setFile(null)} />
        ) : (
          <>
            <FileUploader
              variant="simplified"
              entriesFirst
              validateEntryDone={false}
              upload={{ ref: `${r.id}-documento-final`, name: "documento_final", accept: ".pdf", maxEntries: 1, maxFileSize: MAX_MB * 1048576, entries: uploading ? [uploading] : [] }}
              onChange={pick}
              onCancel={() => {
                if (timer.current) clearInterval(timer.current);
                setUploading(null);
              }}
            />
            <p className="mt-1.5 text-[13px] text-brand-purple-dark/55">{`PDF até ${MAX_MB}MB`}</p>
          </>
        )}
      </FieldBlock>
      <Input
        id={`${r.id}-obs-documento-final`}
        type="textarea"
        label="Observações do documento final"
        placeholder="Notas sobre o documento anexado (opcional)."
        rows={3}
        value={obs}
        onChange={(event) => setObs(event.target.value)}
      />
    </EditorPage>
  );
}
