import { type SelectItem } from "./Input.js";
/**
 * Esconde as etiquetas que passam de `limit(largura)` e devolve quais ficaram
 * escondidas. Mede com todas visíveis sempre que a seleção ou a largura muda.
 */
export declare function useTagOverflow(root: React.RefObject<HTMLElement | null>, key: string, limit: (width: number) => number): {
    key: string;
    hidden: number[];
    width: number;
} | {
    hidden: number[];
    width: undefined;
};
export declare function MultiSelectSearch({ id, options: optionsProp, createOptions, errors, name, prompt, label, callback, disabled, leftIcon, searchAction, value, onChange, }: {
    id: string;
    options?: readonly SelectItem[];
    createOptions?: readonly SelectItem[];
    errors?: string[];
    name: string;
    prompt?: string;
    label?: string;
    callback?: (search: string) => SelectItem[];
    disabled?: boolean;
    leftIcon?: string;
    searchAction?: () => void;
    classOptions?: string;
    value?: string[];
    onChange?: (values: string[]) => void;
}): import("react").JSX.Element;
