import { type ReactNode } from "react";
/** `title_to_slug/1`. */
export declare function titleToSlug(title: string): string;
export type TabSlot = {
    title: string;
    mobileTitle?: string;
    content: ReactNode;
};
export declare function Tabs({ id, className, contentClass, tab, }: {
    id: string;
    className?: string;
    contentClass?: string;
    tab: TabSlot[];
}): import("react").JSX.Element;
export type CardTabSlot = {
    title: string;
    noCard?: boolean;
    content: ReactNode;
};
export declare function CardTabs({ id, header, tab, children, }: {
    id: string;
    header: ReactNode;
    tab: CardTabSlot[];
    children?: ReactNode;
}): import("react").JSX.Element;
export type ButtonTabSlot = {
    title: string;
    disabled?: boolean;
    content: ReactNode;
};
export declare function ButtonTabs({ id, size, className, tab, actions, }: {
    id: string;
    size?: "small" | "normal";
    className?: string;
    tab: ButtonTabSlot[];
    actions?: ReactNode;
}): import("react").JSX.Element;
export type DropdownTabSlot = {
    title: string;
    parentId: string;
    noCard?: boolean;
    content: ReactNode;
};
export declare function DropdownTabs({ id, headers, header, tab, }: {
    id: string;
    /** `[{id, title}]` do original: a lista de `{id, title}` das abas de topo. */
    headers: [string, string][];
    header?: ReactNode;
    tab: DropdownTabSlot[];
}): import("react").JSX.Element;
type Maybe<T> = T | false | null | undefined;
/** Uma aba. Sem `component`, a aba fica desabilitada, como no original. */
export type LazyTab = {
    id: string;
    title: string;
    mobileTitle?: string;
    component?: ReactNode | (() => ReactNode);
    opts?: {
        card?: boolean;
    };
};
/** Um grupo, que vira `dropdown/1` com as abas dentro. */
export type LazyTabGroup = {
    title: string;
    tabs: Maybe<LazyTab>[];
};
export type LazyTabEntry = LazyTab | LazyTabGroup;
export declare function LazyTabs({ id, tabs, opts, activeTab, header, }: {
    id: string;
    tabs: Maybe<LazyTabEntry>[];
    opts?: {
        card?: boolean;
    };
    activeTab?: string;
    header?: ReactNode;
}): import("react").JSX.Element;
export {};
