import type { ReactNode } from "react";
/**
 * `layouts/public.html.heex`: totem, anamnese e demais páginas abertas por link.
 * O layout é só o fundo; o cabeçalho com o logotipo é de cada página (ver o
 * preview, copiado de `Public.AutoCheckinLive.Show`).
 */
export declare function PublicLayout({ flash, children }: {
    flash?: ReactNode;
    children: ReactNode;
}): import("react").JSX.Element;
