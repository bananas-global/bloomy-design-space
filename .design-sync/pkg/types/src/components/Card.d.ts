import type { ReactNode } from "react";
/** `core_components.ex` → `card/1`. */
export declare function Card({ id, className, children, }: {
    id?: string;
    className?: string;
    children: ReactNode;
}): import("react").JSX.Element;
export type InfoCardVariant = "blue" | "orange" | "accent" | "green" | "info";
/**
 * `core_components.ex` → `info_card/1`.
 * Como no original, `class` é aceito mas não é aplicado.
 */
export declare function InfoCard({ title, info, variant, icon, }: {
    title?: string;
    info?: string;
    variant: InfoCardVariant;
    className?: string;
    icon?: string;
}): import("react").JSX.Element;
