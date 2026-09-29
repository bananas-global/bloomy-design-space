import type { ButtonHTMLAttributes, ReactNode } from "react";
/** `core_components.ex` → `button/1`. */
export type ButtonVariant = "default" | "outline" | "tint" | "ghost";
export type ButtonColor = "blue" | "red" | "green" | "purple" | "yellow";
export type ButtonSize = "small" | "medium" | "normal";
export declare function Button({ type, variant, color, size, className, rightIcon, leftIcon, iconType, title, notificationBadge, children, ...rest }: {
    type?: "button" | "submit" | "reset";
    variant?: ButtonVariant;
    color?: ButtonColor;
    size?: ButtonSize;
    className?: string;
    rightIcon?: string;
    leftIcon?: string;
    iconType?: "regular" | "solid";
    title?: string;
    notificationBadge?: boolean;
    children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "color" | "title" | "className" | "children">): import("react").JSX.Element;
