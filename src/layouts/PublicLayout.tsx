import type { ReactNode } from "react";

/**
 * `layouts/public.html.heex`: totem, anamnese e demais páginas abertas por link.
 * O layout é só o fundo; o cabeçalho com o logotipo é de cada página (ver o
 * preview, copiado de `Public.AutoCheckinLive.Show`).
 */
export function PublicLayout({ flash, children }: { flash?: ReactNode; children: ReactNode }) {
  return (
    <>
      {flash}
      <div className="bg-background-public relative h-full min-h-screen min-w-screen">
        <main className="h-full">{children}</main>
      </div>
    </>
  );
}
