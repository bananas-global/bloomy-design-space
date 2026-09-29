/**
 * `core_components.ex` → `tag/1`.
 * `light-red` está nos valores do attr, mas o original não tem classe para ela.
 */
export type TagVariant = "light-blue" | "blue" | "dark-blue" | "cyan" | "light-accent" | "purple" | "light-purple" | "dark-purple" | "light-red" | "red" | "brand" | "green" | "yellow" | "orange";
export declare function Tag({ item, title, variant, className, pill, leftIcon, icon, }: {
    item: string;
    title?: string;
    variant?: TagVariant;
    className?: string;
    pill?: boolean;
    leftIcon?: string;
    icon?: string;
}): import("react").JSX.Element;
export type TagListVariant = "light-blue" | "blue" | "red" | "light-purple" | "orange";
/** `core_components.ex` → `tag_list/1`. */
export declare function TagList({ items, limit, variant, className, }: {
    items: string[];
    limit?: number;
    variant?: TagListVariant;
    className?: string;
}): import("react").JSX.Element;
/** `core_components.ex` → `status_tag/1`. */
export declare function StatusTag({ status, title, className, }: {
    status: boolean;
    title?: string;
    className?: string;
}): import("react").JSX.Element;
