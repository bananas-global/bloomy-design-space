import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../Icon.js";
import { Button } from "./Button.js";

/**
 * Sobreposições — espelho de `modal/1`, `dropdown/1`, `dropdown_menu/1` e
 * `tooltip/1`.
 *
 * No sistema o comportamento vem de hooks JavaScript (`ModalHook`,
 * `DropdownController`) e de `JS.exec` do LiveView. Aqui ele é estado de React.
 * **O que precisa ser igual é o que a pessoa vê e o que o teclado faz**, e é o
 * que está portado: fechar com Esc, fechar clicando no fundo, foco preso dentro
 * do diálogo, e o menu fechando ao clicar fora.
 *
 * O tamanho do diálogo vem do original — `extra_small` a `large` — e o
 * fechamento fica num botão `tint`, como lá.
 */

export type ModalVariant = "extra_small" | "small" | "medium" | "large";

const LARGURA: Record<ModalVariant, string> = {
  extra_small: "max-w-xl",
  small: "max-w-3xl",
  medium: "max-w-5xl",
  large: "max-w-7xl",
};

export function Modal({
  id,
  open,
  onClose,
  title,
  variant = "small",
  children,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  title?: string;
  variant?: ModalVariant;
  children: ReactNode;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  // Esc fecha, como o `phx-window-keydown` com `phx-key="escape"` do original.
  useEffect(() => {
    if (!open) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [open, onClose]);

  // `focus_wrap` do LiveView: o Tab circula dentro do diálogo e não escapa para
  // a página atrás. Sem isto, quem navega por teclado sai do diálogo sem saber.
  useEffect(() => {
    if (!open || !caixa.current) return;
    const foco = caixa.current.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
    );
    foco[0]?.focus();

    const prender = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || foco.length === 0) return;
      const primeiro = foco[0]!;
      const ultimo = foco[foco.length - 1]!;
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    const no = caixa.current;
    no.addEventListener("keydown", prender);
    return () => no.removeEventListener("keydown", prender);
  }, [open]);

  if (!open) return null;

  return (
    <div id={id} className="relative z-50">
      <div
        className="fixed inset-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${id}-title` : undefined}
      >
        <div
          className="fixed inset-0 bg-[var(--color-neutral-900)]/30 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        />

        <div className="flex h-full items-center justify-center">
          <div
            ref={caixa}
            className={[
              "relative m-2 max-h-[85%] w-full overflow-y-auto rounded-2xl bg-white transition md:m-0",
              LARGURA[variant],
            ].join(" ")}
          >
            <div
              className={[
                "flex items-center justify-between",
                title && "border-b border-[var(--color-neutral-100)] p-6",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {title && (
                <h1 id={`${id}-title`} className="m-0 text-2xl font-bold">
                  {title}
                </h1>
              )}
              <Button variant="tint" size="medium" onClick={onClose} aria-label="Fechar">
                <Icon name="fa-times" className="block h-4 w-4 self-center" />
              </Button>
            </div>
            <div className="p-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** `dropdown/1`: painel ancorado num gatilho livre. */
export function Dropdown({
  id,
  trigger,
  children,
  className,
}: {
  id: string;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const foraDaqui = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", foraDaqui);
    return () => document.removeEventListener("mousedown", foraDaqui);
  }, [aberto]);

  return (
    <div id={id} ref={raiz} className={["relative", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        className="cursor-pointer border-0 bg-transparent p-0"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
      >
        {trigger}
      </button>

      {aberto && (
        <nav className="absolute z-[9999]">
          <div className="mt-1 min-w-56 rounded-md border border-[var(--color-neutral-200)]/70 bg-white p-1 text-[var(--color-neutral-900)] shadow-md">
            {children}
          </div>
        </nav>
      )}
    </div>
  );
}

/** `dropdown_menu/1`: os três pontinhos e uma lista de ações. */
export function DropdownMenu({ id, items }: { id: string; items: ReactNode[] }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const foraDaqui = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", foraDaqui);
    return () => document.removeEventListener("mousedown", foraDaqui);
  }, [aberto]);

  return (
    <div id={id} ref={raiz} className="relative">
      <button
        type="button"
        className="cursor-pointer border-0 bg-transparent"
        aria-expanded={aberto}
        aria-label="Mais ações"
        onClick={() => setAberto((a) => !a)}
      >
        <div className="flex items-center justify-center p-3 transition-transform">
          <Icon name="fa-ellipsis-vertical" className="text-xl font-semibold" />
        </div>
      </button>

      {aberto && (
        <nav className="absolute z-[9999]">
          <ul className="m-0 mt-1 min-w-48 list-none rounded border border-[var(--color-neutral-200)]/70 bg-white p-0 shadow">
            {items.map((item, i) => (
              <li
                key={i}
                className="text-neutral/70 hover:bg-[var(--color-brand-purple-dark)]/10 [&>*]:block [&>*]:h-full [&>*]:w-full [&>*]:cursor-pointer [&>*]:px-4 [&>*]:py-2 [&>*]:text-left"
              >
                {item}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
