/**
 * Solicitações de melhoria — peças pequenas usadas por mais de uma tela.
 * Montadas com `tag/1`, `file_uploader/1` e `item/1`; nenhuma é componente novo
 * do sistema.
 */
import type { ReactNode } from "react";
import { FileItem, FileUploader } from "../../components/FileUploader.js";
import { Icon } from "../../components/Icon.js";
import { Tag } from "../../components/Tag.js";
import { filesOf } from "./store.js";
import { PRIO, STATUS, TAG_OF, TONE_CLASS, fmt, prioOf, scoreOf, type Sm, type SmFile, type StatusId, type Tone } from "./model.js";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

/** A etapa da SM como `tag/1`, com o ícone da etapa. */
export function StageTag({ status }: { status: StatusId }) {
  const st = STATUS[status];
  return <Tag item={st.label} variant={TAG_OF[st.tone]} leftIcon={st.icon} className="whitespace-nowrap" />;
}

/** A prioridade (P0–P4) como `tag/1`; sem notas, "A definir". `full` mostra o nome e o score. */
export function PrioTag({ sm, full = false }: { sm: Pick<Sm, "scores" | "p0">; full?: boolean }) {
  const p = prioOf(sm);
  if (!p) return <Tag item={full ? "Sem prioridade" : "A definir"} title="Ainda sem notas do PMO" variant="dark-purple" />;
  const m = PRIO[p];
  return <Tag item={full ? `${m.full} · ${fmt(scoreOf(sm))} pts` : m.short} title={`${m.full} · ${fmt(scoreOf(sm))} pts`} variant={TAG_OF[m.tone]} className="whitespace-nowrap" />;
}

/** Quadradinho com o ícone de uma etapa, no tom dela. */
export function ToneIcon({ icon, tone, size = "md" }: { icon: string; tone: Tone; size?: "sm" | "md" }) {
  return (
    <span className={cx("inline-flex flex-none items-center justify-center rounded-lg", size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9", TONE_CLASS[tone])}>
      <Icon name={icon} type="solid" />
    </span>
  );
}

/** Rótulo pequeno sobre um valor, como as "facts" do protótipo. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-black text-brand-purple-dark/60">{label}</p>
      <div className="text-sm font-bold text-brand-purple-dark">{children}</div>
    </div>
  );
}

/** Uma resposta do formulário ou um texto longo da governança. */
export function Answer({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-black text-brand-purple-dark/60">{label}</p>
      <p className="whitespace-pre-line text-sm leading-relaxed text-brand-purple-dark/80">{children}</p>
    </div>
  );
}

/** "Pendente: …" ou a frase de pronto, ao lado do botão que fecha a etapa. */
export function Pending({ missing, ready, joiner = ", " }: { missing: string[]; ready: string; joiner?: string }) {
  return <p className="text-sm font-bold text-brand-purple-dark/60">{missing.length ? `Pendente: ${missing.join(joiner)}.` : ready}</p>;
}

/** Os arquivos de uma SM, de um comentário ou de uma evidência, com `item/1` simplificado. */
export function FileList({ files }: { files: SmFile[] }) {
  if (!files.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {files.map((f) => (
        <FileItem key={f.id} fileName={f.name} size={f.size} url={f.url} variant="simplified" />
      ))}
    </div>
  );
}

const ACCEPT = "image/*,video/*,.pdf,.xls,.xlsx,.csv,.doc,.docx,.txt";

/**
 * `file_uploader/1` com as entradas controladas pela tela: o arquivo escolhido
 * entra na lista e o "x" tira.
 */
export function SmUploader({
  id,
  files,
  onChange,
  variant = "default",
}: {
  id: string;
  files: SmFile[];
  onChange: (files: SmFile[]) => void;
  variant?: "default" | "simplified";
}) {
  return (
    <FileUploader
      variant={variant}
      upload={{
        ref: id,
        accept: ACCEPT,
        maxEntries: 10,
        entries: files.map((f) => ({ ref: f.id, clientName: f.name, clientSize: f.size, progress: 100, done: false })),
      }}
      onChange={(list) => onChange([...files, ...filesOf(list)])}
      onCancel={(ref) => onChange(files.filter((f) => f.id !== ref))}
    />
  );
}
