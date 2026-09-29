import { type ChangeEvent, type ReactNode } from "react";
import { type FormField } from "./Input.js";
/**
 * `core_components.ex` → `fake_radio_group/1`, `radio_group/1`,
 * `radio_selector/1`, `checkbox_group/1`, `radio_cards/1` e `tooltip/1`.
 * Slots com atributos viram listas (`radio`, `checkbox`, `option`).
 */
type Variant = "default" | "purple";
/** `core_components.ex` → `fake_radio_group/1`. */
export declare function FakeRadioGroup({ label, selectedValue, variant, className, radio, }: {
    label?: string;
    selectedValue?: unknown;
    variant?: Variant;
    className?: string;
    radio: {
        name: string;
        value: unknown;
        label: string;
    }[];
}): import("react").JSX.Element;
/** `core_components.ex` → `radio_group/1`. */
export declare function RadioGroup({ label, className, wrapperClass, field, variant, radio, required, onChange, }: {
    label: string;
    className?: string;
    wrapperClass?: string;
    field: FormField;
    variant?: Variant;
    radio: {
        value: string;
        label: string;
        disabled?: boolean;
        removable?: () => void;
    }[];
    required?: boolean;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}): import("react").JSX.Element;
/** `core_components.ex` → `radio_selector/1`. */
export declare function RadioSelector({ label, className, field, variant, radio, onChange, }: {
    label?: string;
    className?: string;
    field: FormField;
    variant?: Variant;
    radio: {
        value: string;
        title?: string;
        label?: string;
        icon?: string;
        warningNumber?: number;
        disabled?: boolean;
    }[];
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}): import("react").JSX.Element;
/** `core_components.ex` → `checkbox_group/1`. */
export declare function CheckboxGroup({ label, className, wrapperClass, field, checkbox, required, onChange, }: {
    label: string;
    className?: string;
    wrapperClass?: string;
    field: FormField;
    checkbox: {
        value: string;
        label: string;
        disable?: boolean;
    }[];
    required?: boolean;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}): import("react").JSX.Element;
/** `core_components.ex` → `radio_cards/1`. */
export declare function RadioCards({ id, value, name, title, option, onChange, }: {
    id: string;
    value?: string;
    name?: string;
    title?: string;
    option: {
        id: string;
        title: string;
        subtitle?: string;
        badge?: string;
        icon?: string;
        children?: ReactNode;
    }[];
    /** O `phx-click="select-option"` com `phx-value-value`. */
    onChange?: (value: string) => void;
}): import("react").JSX.Element;
type Placement = "top" | "bottom" | "left" | "right";
/**
 * `core_components.ex` → `tooltip/1`. Como o hook `Tooltip`: o conteúdo vai
 * para o `body`, aparece no `mouseenter` do gatilho quando `active` é `"true"`
 * e é posicionado com `offset(4)`, `flip` e `shift({padding: 8})`.
 */
export declare function Tooltip({ id, placement, tooltipClass, triggerClass, tooltipTrigger, tooltipContent, }: {
    id: string;
    placement?: Placement;
    tooltipClass?: string;
    triggerClass?: string;
    tooltipTrigger: ReactNode | {
        active?: "true" | "false";
        children: ReactNode;
    };
    tooltipContent: ReactNode;
}): import("react").JSX.Element;
export {};
