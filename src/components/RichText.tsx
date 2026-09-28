import { useEffect, useRef, useState } from "react";
import type QuillType from "quill";
import "quill/dist/quill.core.css";
import { Button } from "./Button.js";
import { Icon } from "./Icon.js";
import { cx } from "./Input.js";

/**
 * `rich_text_components.ex` → `BloomyWeb.RichTextComponents` (`input/1` com
 * `type="rich_text"`), com o mesmo Quill do hook `RichTextEditorController`.
 *
 * Diferenças inevitáveis: `patternModule` não consulta `Bloomy.TextPatterns` —
 * os padrões chegam prontos em `patterns`; e o texto da IA entra como
 * parágrafos simples, sem o `marked` + `DOMPurify` do hook.
 */

export type TextPattern = { name: string; text: string };
export type AiGenerate = (
  update: (chunk: string) => void,
  complete: (content: string) => void,
) => void | { error: string } | Promise<void | { error: string }>;

type AiStatus = "idle" | "generating" | "complete" | "waiting-approval";

function toParagraphs(text: string) {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escape(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function RichText({
  id,
  name,
  value,
  readonly = "",
  disabled = false,
  aiGenerate,
  className,
  patternModule,
  patterns = [],
  showHeadings = false,
  onChange,
}: {
  id: string;
  name?: string;
  value?: string;
  readonly?: string;
  disabled?: boolean;
  aiGenerate?: AiGenerate;
  className?: string;
  patternModule?: string;
  patterns?: TextPattern[];
  showHeadings?: boolean;
  onChange?: (html: string) => void;
}) {
  const editorId = `${id}-editor`;
  const [initialHtml] = useState(value ?? "");
  const [html, setHtml] = useState(value ?? "");
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [aiContent, setAiContent] = useState("");
  const [aiError, setAiError] = useState<string>();
  const [dropdown, setDropdown] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const editor = useRef<QuillType | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    void import("quill").then(({ default: Quill }) => {
      if (cancelled || !container.current || !toolbar.current || editor.current) return;
      const quill = new Quill(container.current, {
        modules: { toolbar: toolbar.current },
        readOnly: readonly === "true",
      });
      editor.current = quill;

      const el = root.current!;
      const undo = el.querySelector<HTMLElement>('[data-action="undo"]')!;
      const redo = el.querySelector<HTMLElement>('[data-action="redo"]')!;
      undo.addEventListener("click", () => quill.history.undo());
      redo.addEventListener("click", () => quill.history.redo());

      const replaceClass = (target: HTMLElement, from: string, to: string) => {
        target.classList.remove(from);
        if (!target.classList.contains(to)) target.classList.add(to);
      };
      const heading = el.querySelector<HTMLSelectElement>(".ql-header");
      quill.on("editor-change", () => {
        const stack = quill.history.stack;
        if (stack.undo.length > 0) replaceClass(undo, "text-neutral-50", "text-neutral");
        else replaceClass(undo, "text-neutral", "text-neutral-50");
        if (stack.redo.length > 0) replaceClass(redo, "text-neutral-50", "text-neutral");
        else replaceClass(redo, "text-neutral", "text-neutral-50");
        if (heading && heading.selectedIndex === -1) heading.value = "";
      });
      quill.on("text-change", () => {
        const next = quill.getSemanticHTML();
        setHtml(next);
        onChangeRef.current?.(next);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = () => {
    setAiStatus("idle");
    editor.current?.enable(true);
  };

  const startGeneration = async () => {
    if (!aiGenerate || aiStatus === "generating") return;
    setAiError(undefined);
    setAiContent("");
    setAiStatus("generating");
    editor.current?.enable(false);
    const result = await aiGenerate(
      (chunk) => setAiContent((current) => current + chunk),
      () => setAiStatus("waiting-approval"),
    );
    if (result && "error" in result) {
      setAiError(result.error);
      finish();
    }
  };

  const accept = () => {
    const quill = editor.current;
    if (quill) {
      quill.setContents([]);
      quill.clipboard.dangerouslyPasteHTML(toParagraphs(aiContent));
    }
    finish();
  };

  const insertPattern = (text: string) => {
    setDropdown(false);
    const quill = editor.current;
    if (!quill || !text) return;
    const insertText = text.endsWith(" ") ? text : `${text} `;
    const range = quill.getSelection(true) ?? { index: quill.getLength() };
    quill.clipboard.dangerouslyPasteHTML(range.index, insertText);
    quill.setSelection(range.index + insertText.length, 0);
  };

  const generating = aiStatus !== "idle";

  return (
    <div>
      <div
        ref={root}
        id={editorId}
        data-readonly={readonly}
        className={cx(disabled && "opacity-50")}
        data-with-ai={aiGenerate ? "true" : "false"}
      >
        <div
          ref={toolbar}
          id={`${editorId}-toolbar`}
          className="[&_.ql-active]:text-brand-blue overflow-x-auto md:overflow-visible"
        >
          <div className="bg-white flex items-center border border-brand-purple-dark/10 rounded-t-lg w-max md:w-full md:min-w-[520px]">
            <div className="flex items-center gap-3 py-2 px-4 border-r border-brand-purple-dark/10">
              <button type="button" data-action="undo" className="text-brand-purple-dark/40" title="Desfazer">
                <Icon name="fa-arrow-rotate-left" />
              </button>
              <button type="button" data-action="redo" className="text-brand-purple-dark/40" title="Refazer">
                <Icon name="fa-arrow-rotate-right" />
              </button>
            </div>
            {showHeadings && (
              <div className="flex items-center py-2 px-4 border-r border-brand-purple-dark/10">
                <select
                  className="ql-header text-sm text-brand-purple-dark/70 bg-transparent cursor-pointer focus:outline-none"
                  title="Estilo do texto"
                  aria-label="Estilo do texto"
                  defaultValue=""
                >
                  <option value="">Texto normal</option>
                  <option value="1">Título 1</option>
                  <option value="2">Título 2</option>
                  <option value="3">Título 3</option>
                  <option value="4">Título 4</option>
                </select>
              </div>
            )}
            <div className="flex items-center gap-3 py-2 px-4 border-r border-brand-purple-dark/10">
              <button type="button" className="ql-bold" title="Negrito"><Icon name="fa-bold" /></button>
              <button type="button" className="ql-italic" title="Itálico"><Icon name="fa-italic" /></button>
            </div>
            <div className="flex items-center gap-3 py-2 px-4 border-r border-brand-purple-dark/10">
              <button type="button" className="ql-align" value="" title="Alinhar à esquerda">
                <Icon name="fa-align-left" />
              </button>
              <button type="button" className="ql-align" value="center" title="Alinhar no centro">
                <Icon name="fa-align-center" />
              </button>
              <button type="button" className="ql-align" value="right" title="Alinhar à direita">
                <Icon name="fa-align-right" />
              </button>
              <button type="button" className="ql-align" value="justify" title="Justificar">
                <Icon name="fa-align-justify" />
              </button>
            </div>
            <div className="flex items-center gap-3 py-2 px-4">
              <button type="button" className="ql-indent" value="-1" title="Diminuir recuo">
                <Icon name="fa-outdent" />
              </button>
              <button type="button" className="ql-indent" value="+1" title="Aumentar recuo">
                <Icon name="fa-indent" />
              </button>
            </div>

            <div className="flex ml-auto">
              {patternModule && (
                <div className="flex items-center gap-3 border-l border-brand-purple-dark/10 ">
                  <div id={`${editorId}-patterns-dropdown`} className="relative">
                    <div data-button className="cursor-pointer" onClick={() => setDropdown(!dropdown)}>
                      <Button className="border-0 py-0 my-0 text-sm" variant="outline" type="button" rightIcon="fa-chevron-down">
                        Texto Padrão
                      </Button>
                    </div>
                    <nav className="absolute z-[9999] right-0" style={{ display: dropdown ? "block" : "none" }} data-dropdown-menu>
                      <div className="p-1 mt-1 bg-white border rounded-md shadow-md border-neutral-200/70 text-neutral-900 min-w-56">
                        {patterns.length === 0 && (
                          <button
                            type="button"
                            disabled
                            className="p-2 flex items-center gap-2 hover:bg-brand-purple-dark/5 font-bold rounded-md w-full text-brand-purple-dark/60"
                          >
                            Nenhum Padrão Cadastrado
                          </button>
                        )}
                        {patterns.map((pattern) => (
                          <button
                            key={pattern.name}
                            type="button"
                            onClick={() => insertPattern(pattern.text)}
                            className="p-2 flex items-center gap-2 hover:bg-brand-purple-dark/5 font-bold rounded-md w-full text-brand-purple-dark/60"
                          >
                            {pattern.name}
                          </button>
                        ))}
                      </div>
                    </nav>
                  </div>
                </div>
              )}

              {aiGenerate && (
                <div className="flex items-center gap-3 py-2 border-l border-brand-purple-dark/10">
                  <button
                    type="button"
                    data-ai-button
                    disabled={generating}
                    onClick={startGeneration}
                    className={cx("border-0 flex items-center gap-2 px-5", "active:scale-95 transition-all duration-200", "text-sm")}
                  >
                    <span
                      data-ai-button-text
                      className="font-bold"
                      style={{
                        background: "linear-gradient(90deg, #A746AA 0%, #9947A8 25%, #8158BB 50%, #4565B6 74.52%, #55A6D4 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {generating ? "Gerando..." : "Gerar com IA"}
                    </span>
                    <span
                      className="fa-solid fa-sparkles text-base"
                      style={{
                        background: "linear-gradient(270deg, rgba(109, 233, 202, 0.8) 0%, rgba(94, 176, 206, 0.8) 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          ref={container}
          id={`${editorId}-container`}
          className={cx(
            className,
            "rich-text-content",
            "border border-brand-purple-dark/10 min-h-72 md:rounded-b-lg md:border-t-0",
            "flex flex-col items-stretch justify-stretch",
            "[&_.ql-editor]:flex-1 [&_.ql-editor]:max-h-[60vh] [&_.ql-editor]:overflow-y-auto",
            "font-sans text-brand-purple-dark/80",
            "bg-brand-purple-dark/10",
          )}
          dangerouslySetInnerHTML={{ __html: initialHtml }}
        />

        <div
          data-ai-overlay
          data-status={aiStatus}
          className={cx(
            "group absolute top-16 inset-0 bg-white/10 backdrop-blur-[1px] items-start justify-start p-6 transition-all duration-300 ease-in-out",
            "hidden data-[status=generating]:flex data-[status=complete]:flex data-[status=waiting-approval]:flex",
          )}
        >
          <div className="bg-white/90 backdrop-blur-xs border border-brand-purple/60 rounded-lg p-4 max-w-full shadow-lg transition-all duration-300 ease-in-out">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="fa-sparkles" className="h-4 w-4 text-brand-purple animate-pulse" />
              <span className="text-sm font-medium text-brand-purple">A IA está escrevendo...</span>
            </div>
            <div data-ai-container className="max-h-48 overflow-y-auto scroll-smooth thin-scrollbar">
              <div className="text-neutral-800 font-mono text-base pr-4">
                <span data-ai-content>
                  {aiContent}
                  <span className="animate-pulse">|</span>
                </span>
              </div>
              <div className="mt-3 px-2 hidden group-data-[status=generating]:flex group-data-[status=complete]:flex">
                <Button type="button" color="purple" size="small" variant="outline" data-ai-cancel onClick={finish}>
                  Cancelar
                </Button>
              </div>
              <div
                className={cx("items-center gap-2 mt-3 justify-end px-2", "hidden group-data-[status=waiting-approval]:flex")}
                data-ai-actions
              >
                <Button type="button" color="purple" size="small" variant="outline" rightIcon="fa-xmark" data-ai-deny onClick={finish}>
                  Rejeitar
                </Button>
                <Button type="button" color="purple" size="small" rightIcon="fa-check" data-ai-confirm onClick={accept}>
                  Aceitar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {aiError !== undefined && (
        <div className="absolute top-16 inset-0 bg-white/10 backdrop-blur-[1px] flex items-start justify-start p-6 transition-all duration-300 ease-in-out">
          <div className="bg-white/90 backdrop-blur-xs border border-brand-purple/60 rounded-lg p-4 max-w-full shadow-lg transition-all duration-300 ease-in-out">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="fa-triangle-exclamation" className="h-4 w-4 text-brand-red" />
              <span className="text-sm font-medium text-brand-red">Não foi possível gerar o conteúdo</span>
            </div>
            <div className="max-h-48 overflow-y-auto scroll-smooth thin-scrollbar">
              <div className="text-neutral-800 font-mono text-base pr-4">{aiError}</div>
              <div className="flex items-center gap-2 mt-3 justify-end px-2">
                <Button type="button" color="red" size="small" variant="outline" rightIcon="fa-xmark" onClick={() => setAiError(undefined)}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div id={`${editorId}-input`}>
        <input name={name} id={id} value={html} className="hidden" readOnly />
      </div>
    </div>
  );
}
