import type { ReactNode } from "react";
import kidPlayingWithBlocks from "../assets/kid-playing-with-blocks.jpg";

/**
 * `layouts/auth.html.heex` (login da equipe, da família e da operadora) e
 * `layouts/backoffice_auth.html.heex` (que o router não usa hoje).
 * Adaptação: `md:` vira `md:`.
 */
export function AuthLayout({ flash, children }: { flash?: ReactNode; children: ReactNode }) {
  return (
    <>
      {flash}
      <div className="flex bg-background-auth">
        <div className="min-h-screen flex justify-center items-center flex-1 px-4">{children}</div>
        <div className="flex-1 hidden md:flex justify-center items-center">
          <img src={kidPlayingWithBlocks} className="max-w-[680px] w-full" />
        </div>
      </div>
    </>
  );
}

export function BackofficeAuthLayout({ flash, children }: { flash?: ReactNode; children: ReactNode }) {
  return (
    <>
      {flash}
      <div className="flex">
        <div className="w-full h-screen bg-blue hidden md:block flex-1"></div>
        <div className="min-h-screen flex justify-center items-center flex-1">{children}</div>
      </div>
    </>
  );
}
