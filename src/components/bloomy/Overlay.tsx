import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
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
export type DrawerVariant = "extra_small" | "small" | "medium" | "large" | "custom";

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
  const retorno = useRef<HTMLElement | null>(null);

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
    retorno.current = document.activeElement as HTMLElement | null;
    document.body.classList.add("overflow-hidden");
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
    return () => {
      no.removeEventListener("keydown", prender);
      document.body.classList.remove("overflow-hidden");
      retorno.current?.focus();
    };
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
          id={`${id}-bg`}
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

const DRAWER_WIDTH: Record<Exclude<DrawerVariant, "custom">, string> = {
  extra_small: "max-w-md",
  small: "max-w-xl",
  medium: "max-w-3xl",
  large: "max-w-5xl",
};

const DRAWER_NOOP = () => {};

/** `drawer_modal/1`: diálogo lateral com os mesmos ids e divisões do HEEx. */
export function DrawerModal({
  id, show = false, onCancel = DRAWER_NOOP, title, titleClassName = "text-blue-dark", avatarUrl,
  target, triggerShow, placement = "right", variant = "small", customSize, contentClassName,
  customTitle, customTitleClassName, children, className, ...rest
}: HTMLAttributes<HTMLDivElement> & {
  id: string; show?: boolean; onCancel?: () => void; title?: string;
  titleClassName?: string; avatarUrl?: string; target?: string; triggerShow?: string;
  placement?: "left" | "right"; variant?: DrawerVariant; customSize?: string;
  contentClassName?: string; customTitle?: ReactNode; customTitleClassName?: string;
  children: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const isOpen = show;
  const [mounted, setMounted] = useState(show);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame: number | undefined;
    let exitTimer: number | undefined;
    if (show) {
      setMounted(true);
      frame = window.requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      exitTimer = window.setTimeout(() => setMounted(false), 200);
    }
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      if (exitTimer !== undefined) window.clearTimeout(exitTimer);
    };
  }, [show]);

  useEffect(() => {
    if (!isOpen || !mounted) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    document.body.classList.add("overflow-hidden");
    container.current?.scrollTo(0, 0);
    const focusables = () => Array.from(container.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? []);
    focusables()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCancelRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0]!; const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("keydown", keydown);
      document.body.classList.remove("overflow-hidden");
      returnFocus.current?.focus();
    };
  }, [isOpen, mounted]);

  if (!mounted) return null;
  const width = variant === "custom" ? customSize : DRAWER_WIDTH[variant];
  const offscreen = placement === "right" ? "translate-x-full" : "-translate-x-full";
  return <div id={id} data-trigger-show={triggerShow} data-placement={placement} className={["relative z-50", className].filter(Boolean).join(" ")} {...(target ? { "phx-target": target } : {})} {...rest}>
    <div className="fixed inset-0 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby={title ? `${id}-title` : undefined} aria-describedby={`${id}-description`} tabIndex={0}>
      <div id={`${id}-bg`} className={["fixed inset-0 bg-[var(--color-neutral-900)]/30 transition-all transform", visible ? "opacity-100 ease-out duration-300" : "opacity-0 ease-in duration-200"].join(" ")} aria-hidden="true" onClick={onCancel} />
      <div className={["fixed inset-y-0 flex max-w-full", placement === "right" ? "right-0" : "left-0"].join(" ")}>
        <div ref={container} id={`${id}-container`} className={["relative flex h-full w-full flex-col overflow-y-auto bg-white shadow-main transition-transform ease-in-out", visible ? "translate-x-0 duration-300" : `${offscreen} duration-200`, placement === "right" ? "rounded-l-2xl" : "rounded-r-2xl", width].filter(Boolean).join(" ")}>
          <div className="flex items-center justify-between border-b border-neutral-100 p-6">
            <div className="flex min-w-0 items-center">
              {avatarUrl && <img src={avatarUrl} alt="" className="mr-2 h-7 w-7 rounded-full object-cover" />}
              {title ? <div className="min-w-0"><h1 id={`${id}-title`} className={["m-0 truncate text-2xl font-bold", titleClassName].filter(Boolean).join(" ")}>{title}</h1></div> : <div className={customTitleClassName}>{customTitle}</div>}
            </div>
            <Button id={`${id}-btn-close`} data-drawer-id={id} data-close-drawer type="button" variant="tint" aria-label="Fechar" onClick={onCancel}><Icon name="fa-times" className="block h-4 w-4 self-center" /></Button>
          </div>
          <div id={`${id}-content`} className={["flex-1 p-6", contentClassName].filter(Boolean).join(" ")}>{children}</div>
        </div>
      </div>
    </div>
  </div>;
}

/** Conteúdo secundário do `MultiStepModal`; quem envolve controla a tela ativa. */
export function ModalContent({ title, className, onClose, children, ...rest }: HTMLAttributes<HTMLDivElement> & { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="z-10 w-full rounded-2xl bg-white" {...rest}>
    <div className="flex h-full max-h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-100 p-6">
        <h1 className="m-0 text-2xl font-bold text-blue-dark">{title}</h1>
        <Button type="button" variant="tint" data-close-screen aria-label="Voltar" onClick={onClose}><Icon name="fa-arrow-turn-down-left" className="block h-4 w-4 self-center" /></Button>
      </div>
      <div className={["flex-1 overflow-y-scroll p-6", className].filter(Boolean).join(" ")}>{children}</div>
    </div>
  </div>;
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
