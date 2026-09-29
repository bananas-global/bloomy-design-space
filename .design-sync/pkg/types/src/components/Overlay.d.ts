import { type HTMLAttributes, type ReactNode } from "react";
export type ModalVariant = "extra_small" | "small" | "medium" | "large" | "custom";
/** Slot `custom_title`, com o `attr :class` dele. */
export type CustomTitleSlot = {
    className?: string;
    children: ReactNode;
};
export declare function Modal({ id, show, title, titleClass, avatarUrl, onCancel, variant, customSize, withPadding, customTitle, children, ...rest }: {
    id: string;
    show?: boolean;
    title?: string;
    titleClass?: string;
    avatarUrl?: string;
    onCancel?: () => void;
    variant?: ModalVariant;
    customSize?: string;
    withPadding?: boolean;
    customTitle?: CustomTitleSlot;
    children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "id" | "title" | "children">): import("react").JSX.Element | null;
export type DrawerVariant = ModalVariant;
export declare function DrawerModal({ id, show, title, titleClass, avatarUrl, onCancel, placement, variant, customSize, headerClass, contentClass, customTitle, children, ...rest }: {
    id: string;
    show?: boolean;
    title?: string;
    titleClass?: string;
    avatarUrl?: string;
    onCancel?: () => void;
    placement?: "left" | "right";
    variant?: DrawerVariant;
    customSize?: string;
    headerClass?: string;
    contentClass?: string;
    customTitle?: CustomTitleSlot;
    children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "id" | "title" | "children">): import("react").JSX.Element | null;
/**
 * Tela secundária de um modal de várias telas. O botão de voltar tem
 * `data-close-screen`, que o `MultiStepModal` escuta; aqui é `onClose`.
 */
export declare function ModalContent({ title, className, onClose, children, ...rest }: {
    title: string;
    className?: string;
    onClose?: () => void;
    children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "title" | "children">): import("react").JSX.Element;
export type DropdownPlacement = "bottom-end" | "bottom-start" | "bottom";
export declare function Dropdown({ id, className, dropdownClass, placement, items, children, }: {
    id?: string;
    className?: string;
    dropdownClass?: string;
    placement?: DropdownPlacement;
    items: ReactNode;
    children: ReactNode;
}): import("react").JSX.Element;
export declare function DropdownMenu({ id, items }: {
    id: string;
    items: ReactNode[];
}): import("react").JSX.Element;
