/**
 * Campo de imagem do editor de modelo (`RelImageField` de `relatorios-imagem.jsx`).
 * Novo — não existe no Phoenix: gráficos em JPEG/PNG que entram no PDF, cada
 * um com legenda, largura (inteira/metade) e ordem. A área de envio é o
 * `FileUploader` (variant `simplified`) do catálogo.
 *
 * - `field: { id; title; hint?; max? }` — seção `kind: "image"` do modelo, ou um
 *   campo extra criado no editor.
 * - `value?: ReportImage[]`, `onChange(next)`.
 * - `disabled?` — só leitura.
 * - `titleEditable?` + `onTitle(t)` — campo extra, com título editável.
 * - `onRemoveField?` — remove o campo extra inteiro.
 */
import { useRef } from "react";
import { Button } from "../../components/Button.js";
import { FileUploader } from "../../components/FileUploader.js";
import { Icon } from "../../components/Icon.js";
import { Input, Label } from "../../components/Input.js";
import { useReports } from "./store.js";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export type ReportImage = { id: string; name: string; size: string; src: string; caption: string; width: "full" | "half" };
export type ImageFieldDef = { id: string; title: string; hint?: string; max?: number };

const MAX_MB = 5;
const ACCEPT = ["image/jpeg", "image/png"];
const sizeText = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.round(b / 1024)} KB`);

/** Seletor "Inteira | Metade" da largura no PDF (`ri__seg`). Novo — não existe no Phoenix. */
function WidthToggle({ value, onChange }: { value: ReportImage["width"]; onChange: (w: ReportImage["width"]) => void }) {
  const opt = (w: ReportImage["width"], label: string) => (
    <button
      type="button"
      aria-pressed={value === w}
      onClick={() => onChange(w)}
      className={cx(
        "h-7 rounded-md px-2.5 text-xs font-extrabold transition-colors",
        value === w ? "bg-white text-brand-purple-dark shadow-main" : "text-brand-purple-dark/60",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-0.5 rounded-lg bg-brand-purple-dark/5 p-[3px]" title="Largura no PDF">
      {opt("full", "Inteira")}
      {opt("half", "Metade")}
    </div>
  );
}

export function ImageField({
  field,
  value,
  onChange,
  disabled,
  titleEditable,
  onTitle,
  onRemoveField,
}: {
  field: ImageFieldDef;
  value?: ReportImage[];
  onChange: (next: ReportImage[]) => void;
  disabled?: boolean;
  titleEditable?: boolean;
  onTitle?: (title: string) => void;
  onRemoveField?: () => void;
}) {
  const { toast } = useReports();
  const items = value ?? [];
  const max = field.max ?? 6;
  const seq = useRef(items.length);

  function addFiles(files: File[]) {
    const room = max - items.length;
    const ok: File[] = [];
    const bad: string[] = [];
    files.forEach((f) => {
      if (!ACCEPT.includes(f.type)) bad.push(`${f.name}: formato não aceito`);
      else if (f.size > MAX_MB * 1048576) bad.push(`${f.name}: maior que ${MAX_MB} MB`);
      else ok.push(f);
    });
    if (ok.length > room) bad.push(`Limite de ${max} imagens neste campo`);
    if (bad.length) toast("error", "Algumas imagens não foram anexadas", bad.join(" · "));
    const take = ok.slice(0, Math.max(0, room)).map(
      (f): ReportImage => ({ id: `${field.id}-img-${++seq.current}`, name: f.name, size: sizeText(f.size), src: URL.createObjectURL(f), caption: "", width: "full" }),
    );
    if (take.length) onChange([...items, ...take]);
  }
  const patch = (id: string, p: Partial<ReportImage>) => onChange(items.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => {
    const a = items.slice();
    const [x] = a.splice(i, 1);
    a.splice(i + d, 0, x!);
    onChange(a);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        {titleEditable ? (
          <div className="min-w-55 flex-1">
            <Input
              id={`${field.id}-titulo`}
              placeholder="Título do campo (ex.: Gráfico de metas)"
              value={field.title}
              disabled={disabled}
              onChange={(event) => onTitle?.(event.target.value)}
            />
          </div>
        ) : (
          <Label>{field.title}</Label>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap text-brand-purple-dark/55">
          <Icon name="fa-image" />
          {`${items.length}/${max} imagens`}
        </span>
        {onRemoveField && !disabled && (
          <Button type="button" size="medium" variant="tint" color="red" title="Remover campo" aria-label="Remover campo" onClick={onRemoveField}>
            <Icon name="fa-trash-alt" type="solid" />
          </Button>
        )}
      </div>
      {field.hint && <p className="mt-1 mb-2.5 text-[13px] text-brand-purple-dark/60">{field.hint}</p>}

      {items.length > 0 && (
        <div className="my-2.5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((img, i) => (
            <figure
              key={img.id}
              className={cx("m-0 flex flex-col gap-2 rounded-xl border border-neutral-100 bg-white p-2.5", img.width === "half" ? "md:col-span-1" : "md:col-span-2")}
            >
              <div className="flex max-h-80 items-center justify-center overflow-hidden rounded-lg bg-brand-purple-dark/4">
                <img src={img.src} alt={img.caption || img.name} className="block max-h-80 max-w-full object-contain" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="max-w-65 truncate text-[13px] font-bold text-brand-purple-dark">{img.name}</p>
                  <p className="text-xs text-brand-purple-dark/55">{img.size}</p>
                </div>
                {!disabled && (
                  <div className="flex items-center gap-1.5">
                    <WidthToggle value={img.width} onChange={(width) => patch(img.id, { width })} />
                    <Button type="button" size="medium" variant="ghost" title="Mover para cima" aria-label="Mover para cima" disabled={i === 0} className="disabled:opacity-35" onClick={() => move(i, -1)}>
                      <Icon name="fa-arrow-up" type="solid" />
                    </Button>
                    <Button
                      type="button"
                      size="medium"
                      variant="ghost"
                      title="Mover para baixo"
                      aria-label="Mover para baixo"
                      disabled={i === items.length - 1}
                      className="disabled:opacity-35"
                      onClick={() => move(i, 1)}
                    >
                      <Icon name="fa-arrow-down" type="solid" />
                    </Button>
                    <Button
                      type="button"
                      size="medium"
                      variant="tint"
                      color="red"
                      title="Remover imagem"
                      aria-label="Remover imagem"
                      onClick={() => onChange(items.filter((x) => x.id !== img.id))}
                    >
                      <Icon name="fa-trash-alt" type="solid" />
                    </Button>
                  </div>
                )}
              </div>
              <Input
                id={`${img.id}-legenda`}
                placeholder={`Legenda (aparece abaixo da imagem) — ex.: Figura ${i + 1}. Acertos por sessão`}
                value={img.caption}
                disabled={disabled}
                onChange={(event) => patch(img.id, { caption: event.target.value })}
              />
            </figure>
          ))}
        </div>
      )}

      {!disabled && items.length < max && (
        <div className="mt-2">
          <FileUploader
            variant="simplified"
            upload={{ ref: `${field.id}-upload`, name: field.id, accept: ".jpg,.jpeg,.png", maxEntries: max - items.length, maxFileSize: MAX_MB * 1048576, entries: [] }}
            onChange={addFiles}
          />
          <p className="mt-1.5 text-[13px] text-brand-purple-dark/55">{`JPEG ou PNG, até ${MAX_MB} MB por imagem`}</p>
        </div>
      )}
    </div>
  );
}
