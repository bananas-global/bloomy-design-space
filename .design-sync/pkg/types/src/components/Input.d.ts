import { type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { type AiGenerate, type TextPattern } from "./RichText.js";
/**
 * `core_components.ex` → `input/1`, `label/1`, `error/1`, `input_with_select/1`,
 * `checkgroup/1`, `fake_input/1`, `input_switch_card/1`, `switch_card/1`, e
 * `custom_select_component.ex` → `CustomSelectComponent`.
 *
 * `<Input type="…">` despacha para a mesma cláusula do `input/1`. Os atributos
 * têm o nome do Phoenix em camelCase (`input_class` → `inputClass`); `class` e
 * `for` viram `className` e `htmlFor`.
 *
 * Diferença inevitável: no Phoenix o valor volta pelo `phx-change` do form e o
 * servidor re-renderiza. Aqui cada campo guarda o próprio estado a partir de
 * `value` e avisa por `onChange` — evento nativo nos tipos nativos, o valor nos
 * live components (`select`, `select_search`, `multi_select_search`,
 * `checkgroup`, `tags`, `rich_text`, `slider`). `error/1` se chama `FieldError`
 * porque `Error` sombrearia o construtor global.
 */
export type ClassValue = string | false | null | undefined | 0 | ClassValue[];
/** Lista de classes como a do HEEx: aninhada, com `false`/`nil` descartados. */
export declare function cx(...values: ClassValue[]): string;
/** O que um `Phoenix.HTML.FormField` entrega ao componente. */
export type FormField = {
    id: string;
    name: string;
    value?: unknown;
    errors?: string[];
};
export type SelectOption = {
    label: string;
    value: unknown;
    color?: string;
    [key: string]: unknown;
};
export type SelectGroup = {
    group: string;
    items: SelectItem[];
    color?: string;
};
export type SelectItem = SelectOption | SelectGroup;
export type OptionTuple = readonly [string, unknown];
export declare function isGroup(item: SelectItem): item is SelectGroup;
/** `parse_value/1` dos live components de seleção. */
export declare function parseValue(value: unknown): string;
/**
 * Estado local que acompanha a prop: a prop manda quando muda (o servidor
 * re-renderizou), o estado manda entre uma mudança e outra (o DOM do navegador).
 */
export declare function useMirror<T>(value: T): [T, (next: T) => void];
/**
 * Posição do painel `fixed` das seleções, como o `computePosition` dos hooks:
 * `bottom-start`, `offset(4)`, `flip` para cima, `shift({padding: 16})` e
 * `size` limitando largura e altura. Medir com `left/top = 0` dá a origem do
 * bloco de contenção, então funciona também dentro de um ancestral com
 * `transform` (o `drawer_modal`).
 */
export declare function placeFloating(reference: HTMLElement, floating: HTMLElement, container: HTMLElement): void;
/** Abre, fecha, reposiciona e fecha no clique de fora — o miolo dos hooks de seleção. */
export declare function useFloatingPanel(open: boolean, setOpen: (open: boolean) => void, refs: {
    reference: React.RefObject<HTMLElement | null>;
    container: React.RefObject<HTMLElement | null>;
    panel: React.RefObject<HTMLElement | null>;
}, inside: (target: Node) => boolean): void;
/** Navegação por teclado dos hooks: setas, Tab, Enter escolhe, Esc fecha. */
export declare function useOptionKeys(open: boolean, count: number, highlight: number, setHighlight: (index: number) => void, choose: (index: number) => void, close: () => void, target?: React.RefObject<HTMLElement | null>): void;
/** `core_components.ex` → `label/1`. */
export declare function Label({ htmlFor, className, color, children, }: {
    htmlFor?: string;
    className?: string;
    color?: string;
    children?: ReactNode;
}): import("react").JSX.Element;
/** `core_components.ex` → `error/1`. */
export declare function FieldError({ className, message, children, }: {
    className?: string;
    message?: string;
    children?: ReactNode;
}): import("react").JSX.Element;
type InputType = "checkbox" | "color" | "date" | "datetime-local" | "email" | "file" | "month" | "number" | "password" | "tags" | "range" | "slider" | "search" | "select" | "tel" | "text" | "textarea" | "time" | "url" | "week" | "switch" | "rich_text" | "hidden" | "select_search" | "multi_select_search" | "custom_select" | "value_switch" | "counter" | "checkgroup";
type InputAttrs = {
    id?: string;
    name?: string;
    label?: string;
    value?: unknown;
    inputValue?: unknown;
    className?: string;
    inputClass?: string;
    innerClass?: string;
    callback?: (search: string) => SelectItem[];
    removable?: (value: unknown) => (() => void) | null | undefined | false;
    searchAction?: () => void;
    hint?: string;
    color?: "default" | "default_darker" | "purple";
    variant?: "default" | "rounded_left" | "rounded_right";
    leftIcon?: string;
    rightIcon?: string;
    clear?: boolean;
    field?: FormField;
    errors?: string[];
    checked?: boolean;
    prompt?: string;
    options?: readonly (SelectItem | OptionTuple)[];
    createOptions?: readonly SelectItem[];
    classOptions?: string;
    multiple?: boolean;
    errorTag?: Record<string, string>;
    aiGenerate?: AiGenerate;
    patternModule?: string;
    /** Os padrões de texto que `Bloomy.TextPatterns` devolveria para `patternModule`. */
    patterns?: TextPattern[];
    showHeadings?: boolean;
    tagLabel?: string;
    rows?: number;
    cols?: number;
    children?: ReactNode;
};
type HtmlRest = Omit<InputHTMLAttributes<HTMLInputElement>, keyof InputAttrs | "type" | "onChange" | "defaultValue">;
type NativeType = Exclude<InputType, "textarea" | "select" | "custom_select" | "select_search" | "slider" | "multi_select_search" | "checkgroup" | "tags" | "rich_text">;
export type InputProps = InputAttrs & HtmlRest & ({
    type?: NativeType;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
} | {
    type: "textarea";
    onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
} | {
    type: "select" | "custom_select" | "select_search" | "slider";
    onChange?: (value: string | null) => void;
} | {
    type: "multi_select_search" | "checkgroup" | "tags";
    onChange?: (values: string[]) => void;
} | {
    type: "rich_text";
    onChange?: (html: string) => void;
});
export declare function Input(props: InputProps): import("react").JSX.Element;
/** `core_components.ex` → `input_with_select/1`. */
export declare function InputWithSelect({ label, textField, selectField, options, disabled, className, }: {
    label?: string;
    textField: FormField;
    selectField: FormField;
    options?: readonly (SelectItem | OptionTuple)[];
    disabled?: boolean;
    className?: string;
}): import("react").JSX.Element;
/**
 * `core_components.ex` → `checkgroup/1`. Repassa `variant`, mas a cláusula
 * `checkgroup` do `input/1` lê `color` — no original a variante não tem efeito.
 */
export declare function Checkgroup({ variant, ...props }: Omit<InputAttrs, "variant"> & {
    variant?: "default" | "purple";
    disabled?: boolean;
    form?: string;
    readOnly?: boolean;
    onChange?: (values: string[]) => void;
}): import("react").JSX.Element;
/** `core_components.ex` → `fake_input/1`. */
export declare function FakeInput({ value, label, labelColor, rightIcon, className, ...rest }: {
    value?: ReactNode;
    label?: string;
    labelColor?: "default" | "blue";
    rightIcon?: string;
    className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className">): import("react").JSX.Element;
/** `core_components.ex` → `input_switch_card/1`. */
export declare function InputSwitchCard({ label, active, className, children, }: {
    label: string;
    active: FormField;
    className?: string;
    children?: ReactNode;
}): import("react").JSX.Element;
/**
 * `core_components.ex` → `switch_card/1`. Como no original, `multiple` e
 * `inputValue` são aceitos mas não chegam à chave, que recebe só o `field`.
 */
export declare function SwitchCard({ field, className, title, description, onChange, }: {
    id?: string;
    field: FormField;
    inputValue?: unknown;
    className?: string;
    multiple?: boolean;
    title: string;
    description: string;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}): import("react").JSX.Element;
export declare function flattenOptions(options: readonly SelectItem[]): SelectOption[];
/** `custom_select_component.ex` → `BloomyWeb.CustomSelectComponent`. */
export declare function CustomSelect({ id, options, createOptions, name, prompt, label, disabled, errorTag, inputClass, clear, value: valueProp, onChange, }: {
    id: string;
    options?: readonly SelectItem[];
    createOptions?: readonly SelectItem[];
    errors?: string[];
    name?: string;
    prompt?: string;
    label?: string;
    disabled?: boolean;
    errorTag?: Record<string, string>;
    inputClass?: string;
    clear?: boolean;
    value?: unknown;
    variant?: string;
    color?: string;
    classOptions?: string;
    onChange?: (value: string | null) => void;
}): import("react").JSX.Element;
export {};
