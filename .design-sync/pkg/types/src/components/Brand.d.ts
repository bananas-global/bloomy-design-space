import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { type FormField } from "./Input.js";
/** `brand_components.ex` → `brand_button/1`. */
export declare function BrandButton({ type, color, size, variant, className, rightIcon, leftIcon, children, ...rest }: {
    type?: "button" | "submit" | "reset";
    color?: "purple" | "light-purple" | "red";
    size?: "small" | "normal";
    variant?: "default" | "tint";
    className?: string;
    rightIcon?: string;
    leftIcon?: string;
    children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "color" | "className" | "children">): import("react").JSX.Element;
/** `brand_components.ex` → `brand_input/1`. */
export declare function BrandInput({ id, name, value, className, color, type, field, errors, errorTag, ...rest }: {
    id?: string;
    name?: string;
    value?: unknown;
    className?: string;
    color?: "white" | "dark-purple";
    type?: "text" | "password" | "email";
    field?: FormField;
    errors?: string[];
    errorTag?: Record<string, string>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "value" | "className" | "color" | "type">): import("react").JSX.Element;
