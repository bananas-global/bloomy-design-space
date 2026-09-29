import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
/** `core_components.ex` → `header/1`. */
export declare function Header({ className, variant, children, subtitle, actions, }: {
    className?: string;
    variant?: "small" | "default" | "large";
    children: ReactNode;
    subtitle?: ReactNode;
    actions?: ReactNode;
}): import("react").JSX.Element;
/** O slot `:item` de `list/1`: `title` e o conteúdo. */
export type ListItem = {
    title: string;
    children: ReactNode;
};
/** `core_components.ex` → `list/1`. */
export declare function List({ item }: {
    item: ListItem[];
}): import("react").JSX.Element;
/** `core_components.ex` → `back/1`. `<.link navigate>` vira `<a href>`. */
export declare function Back({ navigate, children }: {
    navigate: string;
    children: ReactNode;
}): import("react").JSX.Element;
/** Os campos de `Flop.Meta` que `meta_info/1` lê. */
export type Meta = {
    totalCount: number;
    currentOffset: number;
    pageSize: number;
};
/** `core_components.ex` → `meta_info/1`. */
export declare function MetaInfo({ meta }: {
    meta: Meta;
}): import("react").JSX.Element;
/** `core_components.ex` → `inside_card/1`. */
export declare function InsideCard({ title, subtitle, value, className, icon, }: {
    title?: string;
    subtitle?: string;
    value?: string;
    className?: string;
    icon?: string;
}): import("react").JSX.Element;
/** `core_components.ex` → `empty_state_card/1`. */
export declare function EmptyStateCard({ icon, text, className, children, }: {
    icon: string;
    text: string;
    className?: string;
    children?: ReactNode;
}): import("react").JSX.Element;
/** `core_components.ex` → `loading_card/1`. */
export declare function LoadingCard({ message }: {
    message: string;
}): import("react").JSX.Element;
/** O slot `:item` de `timeline_list/1`: `icon`, `color` e o conteúdo. */
export type TimelineListItem = {
    icon?: string;
    color?: "blue" | "green";
    children: ReactNode;
};
/** `core_components.ex` → `timeline_list/1`. */
export declare function TimelineList({ item }: {
    item: TimelineListItem[];
}): import("react").JSX.Element;
export type AvatarSize = "extra_small" | "small" | "medium" | "extra_medium" | "large" | "extra_large" | "custom";
/**
 * `core_components.ex` → `avatar/1`.
 * Os átomos do Phoenix (`:small`, `:round`) viram strings.
 */
export declare function Avatar({ imageUrl, size, shape, title, className, style, }: {
    imageUrl?: string;
    size?: AvatarSize;
    shape?: "round" | "square";
    title?: string;
    className?: string;
    style?: CSSProperties;
}): import("react").JSX.Element;
/** `core_components.ex` → `progress/1`. */
export declare function Progress({ value, variant, showPercentage, className, ...rest }: {
    value: number;
    variant?: "default" | "error" | "purple" | "accent";
    showPercentage?: boolean;
    className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">): import("react").JSX.Element;
/** `core_components.ex` → `kbd/1`. */
export declare function Kbd({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
