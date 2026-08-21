import { useId, useRef, useState, type DragEvent } from "react";
import { Icon } from "../Icon.js";
import { Label } from "./Input.js";

/**
 * Área de arraste e arquivo escolhido — espelho de
 * `BloomyWeb.FileUploaderComponents`, variante `simplified`.
 *
 * É o componente que o próprio sistema usa no modal de documento do
 * profissional (`add_document_professional_modal.ex` e `edit_document_modal.ex`
 * passam `variant={:simplified}`), então a moldura tracejada, o ícone
 * `fa-file-arrow-up`, a frase e o cartão do arquivo escolhido vêm de lá, não de
 * uma escolha nova.
 *
 * Três diferenças em relação ao original, todas deliberadas:
 *
 * 1. **"Escolha um arquivo" é um `button`, não um `span` com `phx-click`.** No
 *    sistema, quem navega por teclado não alcança o gatilho: o `span` não é
 *    focável. A aparência é a mesma — negrito, sublinhado, cor de marca.
 * 2. **A área de arraste tem rótulo e descrição associados ao input.** O
 *    original deixa o `live_file_input` escondido sem nome acessível; aqui o
 *    input escondido continua sendo o alvo do clique e do teclado, com `label` e
 *    `aria-describedby`.
 * 3. **Um arquivo por documento.** O modal real permite seis (`max_entries: 6`),
 *    e um documento com vários anexos não é o modelo desta especificação:
 *    `ProfessionalDocument.file` é um arquivo só, e é o que as regras de
 *    exportação e compartilhamento leem.
 *
 * Sem progresso e sem cancelar em andamento: o upload aqui é imediato e local,
 * então a barra do original — que existe porque o LiveView envia em pedaços —
 * não teria o que mostrar.
 */

/** `format_byte/1`: base 1000, duas casas, como o original. */
export function formatByte(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  if (bytes < 1000) return `${bytes} B`;

  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value = value / 1000;
    unit += 1;
  }
  return `${Math.round(value * 100) / 100} ${units[unit]}`;
}

export type FileUploaderProps = {
  id?: string;
  name?: string;
  /** Lista de extensões aceitas, no formato do atributo `accept`. */
  accept?: string;
  /** Rótulo do campo. Fica acima da área, como nos outros campos do formulário. */
  label?: string;
  /** O que vale a pena saber antes de escolher: formatos, tamanho, consequência. */
  hint?: string;
  /** Nome do arquivo já anexado — o documento que voltou do servidor. */
  fileName?: string;
  /** Tamanho em bytes, quando conhecido. `0` esconde a linha. */
  fileSize?: number;
  /**
   * `simplified` é o espelho: área de arraste alta, e o cartão do arquivo
   * **abaixo** dela quando há anexo. `inline` é uma caixa só que troca de
   * estado — vazia, ela convida; preenchida, ela mostra o arquivo e oferece
   * trocar. Não existe no original, e é da decisão 0015.
   *
   * O motivo é altura. O drawer de documento tem seis campos, e a área de
   * arraste do sistema gasta 120px para dizer uma coisa que o clique já diz.
   * Com o cartão somado, o campo de arquivo passava de 200px e empurrava o
   * compartilhamento — que é a parte do formulário que decide credenciamento —
   * para fora da primeira tela.
   */
  variant?: "simplified" | "inline";
  errors?: string[];
  className?: string;
  onFileChange?: (file: File | undefined) => void;
};

export function FileUploader({
  id: providedId,
  name,
  accept = ".pdf,.jpg,.jpeg,.png",
  label,
  hint,
  fileName,
  fileSize = 0,
  variant = "simplified",
  errors = [],
  className,
  onFileChange,
}: FileUploaderProps) {
  const generatedId = useId();
  const id = providedId ?? `file-uploader-${generatedId.replace(/:/g, "")}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors.length > 0 ? `${id}-errors` : undefined;
  const statusId = `${id}-status`;
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function choose(file: File | undefined) {
    if (!file) return;
    onFileChange?.(file);
  }

  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files?.[0]);
  }

  /**
   * O campo escondido é sempre o mesmo, nas duas variantes: é ele que recebe o
   * clique, o teclado e o `accept`, e é nele que o rótulo e a descrição se
   * penduram. Nenhuma das duas molduras é focável por si.
   */
  const campo = (
    <input
      ref={input}
      id={id}
      name={name}
      type="file"
      accept={accept}
      className="sr-only"
      aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
      aria-invalid={errors.length > 0 || undefined}
      onChange={(event) => choose(event.currentTarget.files?.[0])}
    />
  );

  const erros = errors.length > 0 && (
    <div id={errorId}>
      {errors.map((message) => (
        <p key={message} className="m-0 mt-2 text-sm font-bold text-[var(--color-danger-fg)]">
          {message}
        </p>
      ))}
    </div>
  );

  const anuncio = (
    <span id={statusId} role="status" className="sr-only">
      {fileName ? `${fileName} selecionado.` : ""}
    </span>
  );

  if (variant === "inline") {
    return (
      <div className={className}>
        {label && <Label htmlFor={id}>{label}</Label>}

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          className={[
            "mt-2 flex items-center gap-3 rounded-lg border p-4 transition-colors",
            // Um estado por vez, e cada um com a sua borda: o vazio é tracejado
            // porque ainda não há nada; o preenchido é sólido e verde porque a
            // condição de salvar está cumprida.
            errors.length > 0
              ? "border-dashed border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/5"
              : fileName
                ? "border-[var(--color-brand-green)]/40 bg-[var(--color-brand-green)]/10"
                : dragging
                  ? "border-dashed border-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/20"
                  : "border-dashed border-[var(--color-brand-purple-dark)]/20",
          ].join(" ")}
        >
          {campo}

          <div
            className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded",
              fileName
                ? "bg-[var(--color-brand-green)]/20"
                : "bg-[var(--color-brand-blue)]/20",
            ].join(" ")}
          >
            <Icon
              name={fileName ? "fa-file-circle-check" : "fa-cloud-arrow-up"}
              type="solid"
              className={
                fileName
                  ? "text-[var(--color-brand-green-dark)]"
                  : "text-[var(--color-blue-dark)]"
              }
            />
          </div>

          <div className="min-w-0 flex-1">
            {fileName ? (
              <>
                <p className="m-0 truncate font-bold text-[var(--color-brand-purple-dark)]">
                  {fileName}
                </p>
                <p id={hintId} className="m-0 text-sm text-[var(--fg-2)]">
                  {fileSize > 0 ? formatByte(fileSize) : hint}
                </p>
              </>
            ) : (
              <>
                {/* O gatilho é o texto, não a caixa: caixa clicável sem função
                    não chega ao teclado, e é o que o `span` do original faz. */}
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="m-0 cursor-pointer border-0 bg-transparent p-0 text-left font-bold text-[var(--color-brand-purple-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]"
                >
                  Selecionar arquivo
                </button>
                <p id={hintId} className="m-0 text-sm text-[var(--fg-2)]">
                  {hint}
                </p>
              </>
            )}
          </div>

          {fileName && (
            // "Trocar" e não "Remover": no formulário de documento, arquivo é
            // condição de salvar. Remover deixaria o formulário num estado que
            // ele não aceita, e a ação que a pessoa quer é substituir.
            <button
              type="button"
              onClick={() => {
                if (input.current) input.current.value = "";
                input.current?.click();
              }}
              className="shrink-0 cursor-pointer border-0 bg-transparent p-0 font-bold text-[var(--color-action)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]"
            >
              Trocar
            </button>
          )}
        </div>

        {erros}
        {anuncio}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Mesmo par de `label/1` e descrição dos outros campos do formulário. */}
      {label && <Label htmlFor={id}>{label}</Label>}
      {hint && (
        <p id={hintId} className="m-0 mt-1 text-sm text-[var(--fg-2)]">{hint}</p>
      )}

      <section
        // `phx-drop-target` do original: a área inteira recebe o arquivo solto.
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        className={[
          "mt-2 flex flex-col items-center rounded-lg border-2 border-dashed py-6 text-[var(--color-blue-dark)] transition-colors",
          // Um estado por vez: duas classes de cor de borda no mesmo elemento
          // dependeriam da ordem no CSS gerado, não da ordem escrita aqui.
          errors.length > 0
            ? "border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/5"
            : dragging
              ? "border-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/20"
              : "border-[var(--color-brand-blue)]/40 bg-[var(--color-brand-blue)]/10",
        ].join(" ")}
      >
        {campo}

        <Icon
          name="fa-file-arrow-up"
          type="solid"
          className="mb-4 text-4xl text-[var(--color-brand-blue-dark)]"
        />

        <p className="m-0 text-center text-[var(--color-brand-purple-dark)]/80">
          Arraste e solte o arquivo aqui ou{" "}
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="cursor-pointer border-0 bg-transparent p-0 font-bold text-[var(--color-brand-blue-dark)] underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]"
          >
            Escolha um arquivo
          </button>
        </p>
      </section>

      {fileName && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--color-brand-purple-dark)]/5 p-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--color-brand-blue)]/20">
            <Icon name="fa-file" className="text-[var(--color-brand-blue-dark)]" />
          </div>
          <div className="min-w-0 flex-1 text-[var(--color-brand-purple-dark)]/80">
            <p className="m-0 truncate text-base font-bold">{fileName}</p>
            {fileSize > 0 && <p className="m-0 text-sm">{formatByte(fileSize)}</p>}
          </div>
          <button
            type="button"
            aria-label={`Remover ${fileName}`}
            onClick={() => {
              if (input.current) input.current.value = "";
              onFileChange?.(undefined);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-brand-red)] transition-all hover:bg-[var(--color-brand-purple-dark)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)]"
          >
            <Icon name="fa-trash-alt" className="block h-4 w-4 self-center" />
          </button>
        </div>
      )}

      {erros}
      {anuncio}
    </div>
  );
}
