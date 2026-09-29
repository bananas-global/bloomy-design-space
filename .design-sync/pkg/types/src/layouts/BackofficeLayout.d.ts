import { type ReactNode } from "react";
import type { ScenarioContext } from "@brucesantos/design-space";
import { type BreadcrumbItem, type DrawerItem, type TimerCustomService } from "../components/BackofficeComponents.js";
import { type UserNotification } from "../components/Notification.js";
/**
 * `layouts/backoffice.html.heex`, com `BackofficeComponents.drawer/1`,
 * `breadcrumbs/1`, `timer/1` e `toast_wrapper/1`.
 *
 * Adaptação: `md:`/`lg:` viram `md:`/`lg:`. O menu é filtrado como o
 * `:if` de cada item: por policy (`context.can`) ou pela lista de papéis do
 * layout (`context.persona.id`). Sem `context`, é a visão do Admin.
 * `SignatureNotificationModal` não foi portado.
 */
export type LayoutContext = Pick<ScenarioContext, "navigate" | "can" | "persona">;
type MenuItem = DrawerItem & {
    visible: (role: string, can: (permission: string) => boolean) => boolean;
};
/** Os `<:item>` do layout, na ordem, com o `:if` de cada um. */
export declare const BACKOFFICE_MENU: MenuItem[];
export type CurrentUser = {
    name: string;
    avatarUrl?: string;
    /** Nomes das unidades de `@current_user.units`. */
    units: string[];
    /** Rótulos (`translate_enum`) de `@current_user.roles`. */
    roles: string[];
    /** Tem cadastro de profissional: mostra "Meu perfil". */
    professional?: boolean;
};
export declare function BackofficeLayout({ context, currentPath, breadcrumbs, hideMenu, currentUser, currentUnit, currentAssistance, now, notifications, universityEnabled, flash, children, }: {
    /** Numa tela de feature, o `context` que ela recebe do motor. */
    context?: LayoutContext;
    /** `@current_path`: decide o item ativo do menu. */
    currentPath?: string;
    /** `@page_breadcrumbs`. */
    breadcrumbs?: BreadcrumbItem[];
    /** `@hide_menu`. */
    hideMenu?: boolean;
    currentUser?: CurrentUser;
    /** `@current_unit.name`. Padrão: a primeira unidade da pessoa. */
    currentUnit?: string;
    /** `@current_assistance`: com ele o cabeçalho mostra o `timer/1`. */
    currentAssistance?: TimerCustomService;
    /** Relógio de referência do `timer/1` (ISO). */
    now?: string;
    notifications?: UserNotification[];
    /** `Bloomy.University.enabled?()`. */
    universityEnabled?: boolean;
    /** Onde o `flash_group/1` do layout fica. */
    flash?: ReactNode;
    children: ReactNode;
}): import("react").JSX.Element;
export {};
