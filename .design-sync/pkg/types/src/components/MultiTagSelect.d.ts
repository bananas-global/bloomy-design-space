/**
 * `multi_tag_select_component.ex` → `BloomyWeb.MultiTagSelectComponent`
 * (`input/1` com `type="tags"`). Enter, Tab ou sair do campo adicionam;
 * Backspace no campo vazio remove a última, como o hook `MultiTagSelect`.
 */
export declare function MultiTagSelect({ name, value, readonly, onChange, }: {
    id?: string;
    name: string;
    value?: string[];
    readonly?: boolean;
    onChange?: (items: string[]) => void;
}): import("react").JSX.Element;
