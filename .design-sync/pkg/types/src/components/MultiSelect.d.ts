import { type FormField } from "./Input.js";
/**
 * `multi_select_component.ex` → `BloomyWeb.MultiSelectComponent`.
 * O `+N` das etiquetas que não cabem vem de `handleOutsideSelect` do hook.
 */
export type MultiSelectOption = {
    id: string;
    label: string;
    details?: string;
};
export declare function MultiSelect({ id, options, field, label, prompt, className, onChange, }: {
    id: string;
    options?: MultiSelectOption[];
    field: FormField;
    label: string;
    prompt?: string;
    className?: string;
    onChange?: (ids: string[]) => void;
}): import("react").JSX.Element;
