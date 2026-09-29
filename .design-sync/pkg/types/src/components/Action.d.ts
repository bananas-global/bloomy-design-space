import { type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
export type LinkButtonVariant = "default" | "outline" | "tint" | "ghost";
export type LinkButtonColor = "blue" | "red" | "purple";
/**
 * `core_components.ex` → `link_button/1`.
 * `<.link navigate>` vira `<a href>`. Como no original, `color="purple"` pinta
 * `bg-brand-accent text-white` em qualquer variante.
 */
export declare function LinkButton({ variant, color, className, navigate, rightIcon, leftIcon, children, ...rest }: {
    variant?: LinkButtonVariant;
    color?: LinkButtonColor;
    className?: string;
    navigate?: string;
    rightIcon?: string;
    leftIcon?: string;
    children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "color" | "className" | "children">): import("react").JSX.Element;
export type CopyButtonVariant = "default" | "outline" | "tint" | "ghost";
export type CopyButtonColor = "blue" | "red" | "green" | "purple";
export type CopyButtonSize = "small" | "normal";
/**
 * `core_components.ex` → `copy_button/1`.
 * O hook `CopyButton` (`assets/js/hooks/copy_button.js`) vira o `onClick`: copia
 * `data-text` e dispara `phx:show-toast`, que o `ToastWrapper` escuta.
 */
export declare function CopyButton({ id, variant, color, size, className, rightIcon, leftIcon, title, textToCopy, children, onClick, ...rest }: {
    id: string;
    variant?: CopyButtonVariant;
    color?: CopyButtonColor;
    size?: CopyButtonSize;
    className?: string;
    rightIcon?: string;
    leftIcon?: string;
    title?: string;
    textToCopy: string;
    children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "id" | "type" | "color" | "title" | "className" | "children">): import("react").JSX.Element;
export declare const SHOW_TOAST_EVENT = "phx:show-toast";
export type ToastType = "success" | "error" | "info";
export type ToastDetail = {
    title: string;
    content: string;
    type: ToastType;
    /** Em milissegundos. Sem ele, o toast fica até ser fechado. */
    closeTime?: number;
};
/** Equivalente ao `push_event(socket, "show-toast", …)` do servidor. */
export declare function showToast(detail: ToastDetail): void;
/**
 * `backoffice_components.ex` → `toast_wrapper/1`.
 * O hook `ToastController` (`assets/js/hooks/toast_controller.js`) vira estado
 * React: cada `phx:show-toast` acrescenta um item do `<template id="toast_item">`.
 */
export declare function ToastWrapper(): import("react").JSX.Element;
