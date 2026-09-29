import { type ReactNode } from "react";
import { type SelectItem, type SelectOption } from "./Input.js";
/**
 * `select_search_component.ex` → `BloomyWeb.SelectSearchComponent`.
 *
 * `callback(search)` devolve as opções da busca, como o `{:ok, options}` do
 * original; sem `callback` a lista fica como veio.
 */
export type SearchColor = "purple" | "orange" | "red" | string;
/** A barra de busca do painel, comum a `SelectSearch` e `MultiSelectSearch`. */
export declare function SearchBar({ id, errors, disabled, inputRef, search, onSearch, searchAction, }: {
    id: string;
    errors: string[];
    disabled: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
    search: string;
    onSearch: (search: string) => void;
    searchAction?: () => void;
}): import("react").JSX.Element;
/** `option_item/1` com grupos aninhados, compartilhado pelas duas buscas. */
export declare function renderSearchItems(items: readonly SelectItem[], opts: {
    highlight: number;
    isSelected: (option: SelectOption) => boolean;
    onChoose: (option: SelectOption) => void;
    withRed: boolean;
}): ReactNode[];
/** Busca com `phx-debounce="100"`: devolve as opções do `callback`, ou as da prop. */
export declare function useSearch(options: readonly SelectItem[], callback?: (search: string) => SelectItem[]): {
    search: string;
    setSearch: (next: string) => void;
    options: readonly SelectItem[];
};
export declare function SelectSearch({ id, options: optionsProp, createOptions, errors, name, prompt, label, callback, disabled, searchAction, leftIcon, className, value: valueProp, onChange, }: {
    id: string;
    options?: readonly SelectItem[];
    createOptions?: readonly SelectItem[];
    errors?: string[];
    name?: string;
    prompt?: string;
    label?: string;
    callback?: (search: string) => SelectItem[];
    disabled?: boolean;
    searchAction?: () => void;
    leftIcon?: string;
    className?: string;
    classOptions?: string;
    value?: unknown;
    onChange?: (value: string | null) => void;
}): import("react").JSX.Element;
