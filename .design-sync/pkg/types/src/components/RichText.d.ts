import "quill/dist/quill.core.css";
/**
 * `rich_text_components.ex` → `BloomyWeb.RichTextComponents` (`input/1` com
 * `type="rich_text"`), com o mesmo Quill do hook `RichTextEditorController`.
 *
 * Diferenças inevitáveis: `patternModule` não consulta `Bloomy.TextPatterns` —
 * os padrões chegam prontos em `patterns`; e o texto da IA entra como
 * parágrafos simples, sem o `marked` + `DOMPurify` do hook.
 */
export type TextPattern = {
    name: string;
    text: string;
};
export type AiGenerate = (update: (chunk: string) => void, complete: (content: string) => void) => void | {
    error: string;
} | Promise<void | {
    error: string;
}>;
export declare function RichText({ id, name, value, readonly, disabled, aiGenerate, className, patternModule, patterns, showHeadings, onChange, }: {
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
}): import("react").JSX.Element;
