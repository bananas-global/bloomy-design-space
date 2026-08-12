import type { ReactNode } from "react";
import { Icon } from "./Icon.js";

export function PublicPageFrame({
  children,
  canReset = false,
}: {
  children: ReactNode;
  canReset?: boolean;
}) {
  return (
    <div className="-mx-4 -my-6 min-h-screen bg-white lg:-mx-8">
      <header className="sticky top-0 z-30 w-full bg-white p-4 shadow-main">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2" aria-label="Bloomy">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-blue)] text-xl font-black text-white">b</span>
            <span className="text-2xl font-black tracking-tight text-[var(--color-brand-purple-dark)]">bloomy</span>
          </div>
          {canReset && (
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-bg text-danger-fg" aria-label="Cancelar e recomeçar">
              <Icon name="fa-times" />
            </button>
          )}
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl px-6 py-12">{children}</div>
    </div>
  );
}
