import { type ReactNode } from "react";
export type DrawerItem = {
    to: string;
    title: string;
    icon: string;
    exact?: boolean;
};
/** `item_active?/2`. */
export declare function itemActive(currentPath: string | undefined, item: DrawerItem): boolean;
export declare function Drawer({ currentPath, className, item, collapsed, onToggle, onNavigate, }: {
    currentPath?: string;
    className?: string;
    item: DrawerItem[];
    /** `data-collapsed` do `aside`: `true` é a barra estreita (e zero no celular). */
    collapsed?: boolean;
    onToggle?: () => void;
    onNavigate?: (to: string) => void;
}): import("react").JSX.Element;
export declare function FormGrid({ className, variant, children, }: {
    className?: string;
    variant?: "small" | "medium";
    children: ReactNode;
}): import("react").JSX.Element;
/** O `custom_service` que `timer/1` lê, já resolvido pelo `case` do tipo de agenda. */
export type TimerCustomService = {
    id: string;
    /** `started_at`, ISO. */
    startedAt: string;
    /** Nome do paciente/responsável, ou o título da agenda de profissional. */
    title?: string;
    avatarUrl?: string;
    /** `translate_enum(schedule_type)`: "Paciente", "AT"… */
    scheduleType: string;
};
export declare function Timer({ customService, now, className, onNavigate, }: {
    customService: TimerCustomService;
    /** Relógio de referência (ISO). O componente não lê a hora do sistema; conta a partir daqui. */
    now: string;
    className?: string;
    onNavigate?: (to: string) => void;
}): import("react").JSX.Element;
export { ToastWrapper, showToast, type ToastDetail } from "./Action.js";
export type BreadcrumbItem = {
    label: string;
    to?: string;
};
export declare function Breadcrumbs({ items, onNavigate }: {
    items?: BreadcrumbItem[];
    onNavigate?: (to: string) => void;
}): import("react").JSX.Element;
