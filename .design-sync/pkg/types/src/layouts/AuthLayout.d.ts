import type { ReactNode } from "react";
/**
 * `layouts/auth.html.heex` (login da equipe, da família e da operadora) e
 * `layouts/backoffice_auth.html.heex` (que o router não usa hoje).
 * Adaptação: `md:` vira `md:`.
 */
export declare function AuthLayout({ flash, children }: {
    flash?: ReactNode;
    children: ReactNode;
}): import("react").JSX.Element;
export declare function BackofficeAuthLayout({ flash, children }: {
    flash?: ReactNode;
    children: ReactNode;
}): import("react").JSX.Element;
