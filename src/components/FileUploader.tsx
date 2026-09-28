import { useRef, useState, type DragEvent, type InputHTMLAttributes } from "react";
import { Button } from "./Button.js";
import { Icon } from "./Icon.js";
import { Progress } from "./Layout.js";

/**
 * `file_uploader_components.ex` → `BloomyWeb.FileUploaderComponents`
 * (`render/1` e `item/1`).
 *
 * Diferença inevitável: o `UploadConfig` do LiveView vira `upload`, e as
 * entradas escolhidas ficam no estado do componente, com `progress` 0 e
 * `done?` falso — é como elas ficam no sistema até o formulário consumir.
 */

export type UploadError = "too_large" | "not_accepted";

export type UploadEntry = {
  ref: string;
  clientName: string;
  clientSize: number;
  progress: number;
  done: boolean;
  errors?: UploadError[];
};

export type UploadConfig = {
  /** O `ref` do upload: vira o `id` do `live_file_input`. */
  ref: string;
  name?: string;
  accept?: string;
  maxEntries?: number;
  maxFileSize?: number;
  /** Entradas vindas de fora; sem elas, o componente guarda as escolhidas. */
  entries?: UploadEntry[];
};

const UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

/** `format_byte/1`: base 1000, e o `Float.round/2` do Elixir escreve `1.0`. */
export function formatByte(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  let value = bytes;
  let unit = 0;
  while (value >= 1000) {
    value /= 1000;
    unit += 1;
  }
  const rounded = String(Math.round(value * 100) / 100);
  return `${rounded.includes(".") ? rounded : `${rounded}.0`} ${UNITS[unit]}`;
}

function errorToString(error: UploadError, upload: UploadConfig) {
  if (error === "too_large") return `Arquivo muito grande, o tamanho máximo é ${formatByte(upload.maxFileSize ?? 0)}`;
  return "Tipo do arquivo não permitido";
}

function validate(file: File, upload: UploadConfig): UploadError[] {
  const errors: UploadError[] = [];
  if (upload.maxFileSize !== undefined && file.size > upload.maxFileSize) errors.push("too_large");
  if (upload.accept) {
    const accepted = upload.accept.split(",").map((item) => item.trim().toLowerCase());
    const name = file.name.toLowerCase();
    if (!accepted.some((ext) => (ext.startsWith(".") ? name.endsWith(ext) : file.type === ext))) errors.push("not_accepted");
  }
  return errors;
}

/** Entradas controladas por `upload.entries` ou guardadas aqui, como faria o LiveView. */
export function useUploadEntries(upload: UploadConfig, onChange?: (files: File[]) => void) {
  const [own, setOwn] = useState<UploadEntry[]>([]);
  const counter = useRef(0);
  const entries = upload.entries ?? own;
  const add = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const added = list.map((file) => ({
      ref: String(counter.current++),
      clientName: file.name,
      clientSize: file.size,
      progress: 0,
      done: false,
      errors: validate(file, upload),
    }));
    setOwn((current) => [...current, ...added].slice(-(upload.maxEntries ?? Infinity)));
    onChange?.(list);
  };
  const cancel = (ref: string) => setOwn((current) => current.filter((entry) => entry.ref !== ref));
  return { entries, add, cancel };
}

function LiveFileInput({
  upload,
  onFiles,
  ...rest
}: { upload: UploadConfig; onFiles: (files: FileList | null) => void } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="file"
      id={upload.ref}
      name={upload.name}
      accept={upload.accept}
      multiple={(upload.maxEntries ?? 1) > 1}
      onChange={(event) => {
        onFiles(event.currentTarget.files);
        event.currentTarget.value = "";
      }}
      {...rest}
    />
  );
}

function Picker({
  variant,
  upload,
  rest,
  onFiles,
}: {
  variant: "default" | "simplified";
  upload: UploadConfig;
  rest: InputHTMLAttributes<HTMLInputElement>;
  onFiles: (files: FileList | null) => void;
}) {
  const choose = () => document.getElementById(upload.ref)?.click();
  const drop = {
    onDragOver: (event: DragEvent) => event.preventDefault(),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      onFiles(event.dataTransfer.files);
    },
  };

  if (variant === "default") {
    return (
      <section className="bg-blue/5 py-6 rounded-lg border-2 border-dashed border-blue/30 flex flex-col items-center text-blue-dark" {...drop}>
        <LiveFileInput upload={upload} onFiles={onFiles} className="hidden" {...rest} />
        <Icon name="fa-image" className="text-4xl mb-6 text-neutral-400" />
        <p className="font-bold text-2xl mb-2">Arquivos</p>
        <p className="mb-6">Arraste os arquivos diretamente para a área destacada e solte-os</p>
        <Button type="button" onClick={choose}>
          Escolher Arquivos
        </Button>
      </section>
    );
  }

  return (
    <section className="bg-brand-blue/10 py-6 rounded-lg border-2 border-dashed border-brand-blue/40 flex flex-col items-center text-blue-dark" {...drop}>
      <LiveFileInput upload={upload} onFiles={onFiles} className="hidden" {...rest} />
      <Icon type="solid" name="fa-file-arrow-up" className="text-4xl mb-4 text-brand-blue-dark" />
      <p className="text-brand-purple-dark/80">
        Arraste e solte o arquivo aqui ou{" "}
        <span className="font-bold text-brand-blue-dark underline cursor-pointer" onClick={choose}>
          Escolha um arquivo
        </span>
      </p>
    </section>
  );
}

function FileStatus({
  entry,
  upload,
  validateEntryDone,
  variant,
  onCancel,
}: {
  entry: UploadEntry;
  upload: UploadConfig;
  validateEntryDone: boolean;
  variant: "default" | "simplified";
  onCancel: () => void;
}) {
  const errors = entry.errors ?? [];
  const progressVariant = errors.length === 0 ? "default" : "error";
  const cancel = (validateEntryDone ? !entry.done : true) && (
    <Button variant="tint" type="button" aria-label="cancel" onClick={onCancel}>
      <Icon name="fa-times" className="block w-4 h-4 self-center" />
    </Button>
  );
  const errorLines = errors.map((err) => (
    <p key={err} className="text-red">
      {errorToString(err, upload)}
    </p>
  ));

  if (variant === "default") {
    return (
      <div className="border border-neutral-100 p-4 rounded-lg flex items-center gap-6">
        <div className="w-12 h-12 rounded-lg bg-blue-light flex items-center justify-center flex-shrink-0">
          <Icon name="fa-file" className="text-blue-dark" />
        </div>
        <div className="text-blue-dark flex-1">
          <p className="font-bold text-lg">{entry.clientName}</p>
          <p>{formatByte(entry.clientSize)}</p>
          <Progress value={entry.progress} variant={progressVariant} />
          {errorLines}
        </div>
        {cancel}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <FileItem fileName={entry.clientName} size={entry.clientSize} variant={variant} />
        <Progress className="mt-2" value={entry.progress} variant={progressVariant} />
        {errorLines}
      </div>
      {cancel}
    </div>
  );
}

export function FileUploader({
  upload,
  rest = {},
  validateEntryDone = true,
  variant = "default",
  entriesFirst = false,
  onChange,
  onCancel,
}: {
  upload: UploadConfig;
  target?: unknown;
  rest?: InputHTMLAttributes<HTMLInputElement>;
  validateEntryDone?: boolean;
  variant?: "default" | "simplified";
  entriesFirst?: boolean;
  /** Os arquivos escolhidos: o `phx-change` do formulário. */
  onChange?: (files: File[]) => void;
  /** O `cancel-upload` com `phx-value-ref`. */
  onCancel?: (ref: string) => void;
}) {
  const { entries, add, cancel } = useUploadEntries(upload, onChange);
  const visible = entries.filter((entry) => (validateEntryDone ? !entry.done : true));
  const statuses = visible.map((entry) => (
    <FileStatus
      key={entry.ref}
      entry={entry}
      upload={upload}
      validateEntryDone={validateEntryDone}
      variant={variant}
      onCancel={() => {
        cancel(entry.ref);
        onCancel?.(entry.ref);
      }}
    />
  ));
  const picker = <Picker variant={variant} upload={upload} rest={rest} onFiles={add} />;

  return (
    <div>
      {entriesFirst ? (
        <>
          {entries.length > 0 && <div className="flex flex-col gap-3 mb-3">{statuses}</div>}
          {picker}
        </>
      ) : (
        <>
          {picker}
          {entries.length > 0 && <div className="flex flex-col-reverse gap-6 mt-4">{statuses}</div>}
        </>
      )}
    </div>
  );
}

const CATEGORIES = {
  normal: "Normal",
  certificate: "Certificado",
  administrative: "Administrativo",
  clinical: "Clínico",
  personal: "Pessoal",
} as const;

function downloadAttributes(fileName: string) {
  return [".jpg", ".jpeg", ".png", ".pdf", ".xml"].some((ext) => fileName.includes(ext)) ? { target: "_blank" } : { download: "" };
}

/** `file_uploader_components.ex` → `item/1`. */
export function FileItem({
  fileName,
  size,
  url,
  removeEvent,
  removeId,
  category,
  variant = "default",
}: {
  fileName: string;
  size: number;
  url?: string;
  removeEvent?: (id: unknown) => void;
  removeId?: unknown;
  target?: unknown;
  category?: keyof typeof CATEGORIES;
  variant?: "default" | "simplified";
}) {
  if (variant === "default") {
    return (
      <div className="border border-neutral-100 p-4 rounded-lg flex items-center gap-6">
        <a href={url} {...downloadAttributes(fileName)}>
          <div className="w-12 h-12 rounded-lg bg-blue-light flex items-center justify-center">
            <Icon name="fa-file" className="text-blue-dark" />
          </div>
        </a>
        <div className="text-blue-dark flex-1">
          <p className="font-bold text-lg">{fileName}</p>
          {size > 0 && <p>{formatByte(size)}</p>}
          {category && <p>Tipo: {CATEGORIES[category]}</p>}
        </div>
        {removeEvent && (
          <Button variant="tint" color="red" type="button" onClick={() => removeEvent(removeId)}>
            <Icon name="fa-trash" className="block w-4 h-4 self-center" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-brand-purple-dark/5 p-3 rounded-lg flex items-center gap-2">
      <a href={url} {...downloadAttributes(fileName)} className="flex items-center gap-2 flex-1">
        <div className="w-7 h-7 rounded bg-brand-blue/20 flex items-center justify-center">
          <Icon name="fa-file" className="text-brand-blue-dark" />
        </div>
        <div className="text-brand-purple-dark/80 flex-1">
          <p className="font-bold text-base">{fileName}</p>
          {size > 0 && <p className="text-sm">{formatByte(size)}</p>}
          {category && <p className="text-sm">Tipo: {CATEGORIES[category]}</p>}
        </div>
      </a>
      {removeEvent && (
        <button
          type="button"
          onClick={() => removeEvent(removeId)}
          data-confirm="Confirmar ação"
          data-confirm-body={`"Deseja confirmar a remoção do arquivo "${fileName}"?"`}
          className={["w-8 h-8 rounded-lg flex items-center justify-center", "text-brand-red hover:bg-brand-purple-dark/10 transition-all "].join(" ")}
        >
          <Icon name="fa-trash-alt" className="block w-4 h-4 self-center" />
        </button>
      )}
    </div>
  );
}
