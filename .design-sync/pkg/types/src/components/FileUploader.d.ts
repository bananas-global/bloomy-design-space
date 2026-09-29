import { type InputHTMLAttributes } from "react";
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
/** `format_byte/1`: base 1000, e o `Float.round/2` do Elixir escreve `1.0`. */
export declare function formatByte(bytes: number): string;
/** Entradas controladas por `upload.entries` ou guardadas aqui, como faria o LiveView. */
export declare function useUploadEntries(upload: UploadConfig, onChange?: (files: File[]) => void): {
    entries: UploadEntry[];
    add: (files: FileList | null) => void;
    cancel: (ref: string) => void;
};
export declare function FileUploader({ upload, rest, validateEntryDone, variant, entriesFirst, onChange, onCancel, }: {
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
}): import("react").JSX.Element;
declare const CATEGORIES: {
    readonly normal: "Normal";
    readonly certificate: "Certificado";
    readonly administrative: "Administrativo";
    readonly clinical: "Clínico";
    readonly personal: "Pessoal";
};
/** `file_uploader_components.ex` → `item/1`. */
export declare function FileItem({ fileName, size, url, removeEvent, removeId, category, variant, }: {
    fileName: string;
    size: number;
    url?: string;
    removeEvent?: (id: unknown) => void;
    removeId?: unknown;
    target?: unknown;
    category?: keyof typeof CATEGORIES;
    variant?: "default" | "simplified";
}): import("react").JSX.Element;
export {};
