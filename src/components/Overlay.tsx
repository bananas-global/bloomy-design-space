import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { Icon } from "./Icon.js";
import { Button } from "./Button.js";
import { Avatar } from "./Layout.js";

/**
 * `core_components.ex` → `modal/1`, `drawer_modal/1`, `modal_content/1`,
 * `dropdown/1`, `dropdown_menu/1`.
 *
 * Os hooks (`ModalHook`, `DrawerHook`, `DropdownController`) e o `JS.show`/`JS.hide`
 * viram estado React: `show` abre, `onCancel` é o `on_cancel`. `target` e
 * `trigger_show` são mecânica do LiveView e não existem aqui.
 */

const cx = (...classes: unknown[]) => (classes.flat(3) as unknown[]).filter(Boolean).join(" ");

/** Montado durante a transição de saída, como o `JS.hide` com `time: 200`. */
function usePresence(show: boolean) {
  const [mounted, setMounted] = useState(show);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame: number | undefined;
    let timer: number | undefined;
    if (show) {
      setMounted(true);
      frame = window.requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      timer = window.setTimeout(() => setMounted(false), 200);
    }
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [show]);

  return { mounted, visible };
}

/** `focus_wrap/1`, `phx-window-keydown` de Esc e `overflow-hidden` no `body`. */
function useDialog(active: boolean, container: RefObject<HTMLElement | null>, onCancel: () => void) {
  const cancel = useRef(onCancel);
  cancel.current = onCancel;

  useEffect(() => {
    if (!active) return;
    document.body.classList.add("overflow-hidden");
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancel.current();
        return;
      }
      if (event.key !== "Tab" || !container.current) return;
      const items = Array.from(
        container.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("keydown", keydown);
      document.body.classList.remove("overflow-hidden");
    };
  }, [active, container]);
}

const NOOP = () => {};

export type ModalVariant = "extra_small" | "small" | "medium" | "large" | "custom";

/** Slot `custom_title`, com o `attr :class` dele. */
export type CustomTitleSlot = { className?: string; children: ReactNode };

export function Modal({
  id,
  show = false,
  title,
  titleClass = "text-blue-dark",
  avatarUrl,
  onCancel = NOOP,
  variant = "small",
  customSize,
  withPadding = true,
  customTitle,
  children,
  ...rest
}: {
  id: string;
  show?: boolean;
  title?: string;
  titleClass?: string;
  avatarUrl?: string;
  onCancel?: () => void;
  variant?: ModalVariant;
  customSize?: string;
  withPadding?: boolean;
  customTitle?: CustomTitleSlot;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "id" | "title" | "children">) {
  const container = useRef<HTMLDivElement>(null);
  const { mounted, visible } = usePresence(show);
  useDialog(show && mounted, container, onCancel);

  if (!mounted) return null;

  const closeButton = (buttonId: string) => (
    <Button
      className={title == null ? "hidden" : undefined}
      id={buttonId}
      data-modal-id={id}
      data-close-modal
      onClick={onCancel}
      type="button"
      variant="tint"
      aria-label="close"
    >
      <Icon name="fa-times" className="block w-4 h-4 self-center" />
    </Button>
  );

  return (
    <div id={id} className="relative z-50" {...rest}>
      <div
        className="fixed inset-0"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        role="dialog"
        aria-modal="true"
        tabIndex={0}
      >
        <div
          id={`${id}-bg`}
          onClick={onCancel}
          className={cx(
            "bg-neutral-900/30 fixed inset-0 transition-opacity",
            visible ? "transition-all transform ease-out duration-300 opacity-100" : "transition-all transform ease-in duration-200 opacity-0",
          )}
          aria-hidden="true"
        />

        <div className="flex h-full items-center justify-center">
          <div
            ref={container}
            id={`${id}-container`}
            className={cx(
              "relative rounded-2xl bg-white transition max-h-[85%] overflow-y-auto w-full",
              "m-2 md:m-0",
              variant === "extra_small" && "max-w-xl",
              variant === "small" && "max-w-3xl",
              variant === "medium" && "max-w-5xl",
              variant === "large" && "max-w-7xl",
              variant === "custom" && customSize,
              visible
                ? "transition-all transform ease-out duration-300 opacity-100 translate-y-0 sm:scale-100"
                : "transition-all transform ease-in duration-200 opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95",
            )}
          >
            <div className={cx("flex justify-between items-center ", title && "border-b border-neutral-100 p-6")}>
              <div className="flex items-center">
                {avatarUrl && <Avatar imageUrl={avatarUrl} size="custom" className="h-7 w-7 mr-2" />}
                {title && <h1 className={cx("font-bold text-2xl", titleClass)}>{title}</h1>}
              </div>
              {title == null && <div className={customTitle?.className}>{customTitle?.children}</div>}

              {closeButton(`${id}-btn-close`)}
            </div>
            {title == null && closeButton(`${id}-btn-close-hidden`)}
            <div id={`${id}-content`} className={withPadding ? "p-6" : undefined}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type DrawerVariant = ModalVariant;

export function DrawerModal({
  id,
  show = false,
  title,
  titleClass = "text-blue-dark",
  avatarUrl,
  onCancel = NOOP,
  placement = "right",
  variant = "small",
  customSize,
  headerClass = "items-center",
  contentClass,
  customTitle,
  children,
  ...rest
}: {
  id: string;
  show?: boolean;
  title?: string;
  titleClass?: string;
  avatarUrl?: string;
  onCancel?: () => void;
  placement?: "left" | "right";
  variant?: DrawerVariant;
  customSize?: string;
  headerClass?: string;
  contentClass?: string;
  customTitle?: CustomTitleSlot;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "id" | "title" | "children">) {
  const container = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const { mounted, visible } = usePresence(show);
  useDialog(show && mounted, container, onCancel);

  // `phx:drawerScrollTop`: o conteúdo volta ao topo quando abre.
  useEffect(() => {
    if (show && mounted) content.current?.scrollTo(0, 0);
  }, [show, mounted]);

  if (!mounted) return null;

  const hidden = placement === "left" ? "-translate-x-full" : "translate-x-full";

  return (
    <div id={id} data-placement={placement} className="relative z-50" {...rest}>
      <div
        className="fixed inset-0 overflow-hidden"
        aria-labelledby={title ? `${id}-title` : undefined}
        aria-describedby={`${id}-description`}
        role="dialog"
        aria-modal="true"
        tabIndex={0}
      >
        <div
          id={`${id}-bg`}
          onClick={onCancel}
          className={cx(
            "bg-neutral-900/30 fixed inset-0 transition-opacity",
            visible ? "transition-all transform ease-out duration-300 opacity-100" : "transition-all transform ease-in duration-200 opacity-0",
          )}
          aria-hidden="true"
        />

        <div
          className={cx(
            "fixed inset-y-0 flex w-screen max-w-full",
            placement === "right" && "right-0 justify-end",
            placement === "left" && "left-0 justify-start",
          )}
        >
          <div
            ref={container}
            id={`${id}-container`}
            className={cx(
              "relative h-full w-full bg-white shadow-main overflow-hidden",
              "flex flex-col",
              placement === "right" && "rounded-l-2xl",
              placement === "left" && "rounded-r-2xl",
              variant === "extra_small" && "max-w-md",
              variant === "small" && "max-w-xl",
              variant === "medium" && "max-w-3xl",
              variant === "large" && "max-w-5xl",
              variant === "custom" && customSize,
              "transition-transform ease-in-out",
              visible ? "duration-300 translate-x-0" : `duration-200 ${hidden}`,
            )}
          >
            <div id={`${id}-header`} className={cx("flex shrink-0 justify-between border-b border-neutral-100 p-6", headerClass)}>
              <div className="flex items-center min-w-0">
                {avatarUrl && <Avatar imageUrl={avatarUrl} size="custom" className="h-7 w-7 mr-2" />}

                {title && (
                  <div className="min-w-0">
                    <h1 id={`${id}-title`} className={cx("font-bold text-2xl truncate", titleClass)}>
                      {title}
                    </h1>
                  </div>
                )}

                {title == null && <div className={customTitle?.className}>{customTitle?.children}</div>}
              </div>

              <Button
                id={`${id}-btn-close`}
                data-drawer-id={id}
                data-close-drawer
                onClick={onCancel}
                type="button"
                variant="tint"
                aria-label="close"
              >
                <Icon name="fa-times" className="block w-4 h-4 self-center" />
              </Button>
            </div>

            <div ref={content} id={`${id}-content`} className={cx("min-h-0 flex-1 overflow-y-auto p-6", contentClass)}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tela secundária de um modal de várias telas. O botão de voltar tem
 * `data-close-screen`, que o `MultiStepModal` escuta; aqui é `onClose`.
 */
export function ModalContent({
  title,
  className,
  onClose,
  children,
  ...rest
}: {
  title: string;
  className?: string;
  onClose?: () => void;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "title" | "children">) {
  return (
    <div className="w-full bg-white rounded-2xl z-10" {...rest}>
      <div className="flex flex-col max-h-full h-full">
        <div className="flex justify-between items-center p-6 border-b border-neutral-100">
          <h1 className="font-bold text-2xl text-blue-dark">{title}</h1>
          <Button type="button" variant="tint" data-close-screen onClick={onClose}>
            <Icon name="fa-arrow-turn-down-left" className="block w-4 h-4 self-center" />
          </Button>
        </div>

        <div className={cx("p-6 overflow-y-scroll flex-1", className)}>{children}</div>
      </div>
    </div>
  );
}

export type DropdownPlacement = "bottom-end" | "bottom-start" | "bottom";

/**
 * `DropdownController`: Floating UI com `strategy: "fixed"`, `offset(4)`,
 * `flip()` e `shift({ padding: 8 })`. O `phx-click-away` do gatilho fecha o
 * menu em qualquer clique fora dele, inclusive num item.
 */
function useDropdown(placement: DropdownPlacement) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const menu = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const t = trigger.current?.getBoundingClientRect();
      const m = menu.current?.getBoundingClientRect();
      if (!t || !m) return;
      let left =
        placement === "bottom-start"
          ? t.left
          : placement === "bottom-end"
            ? t.right - m.width
            : t.left + t.width / 2 - m.width / 2;
      let top = t.bottom + 4;
      if (top + m.height > window.innerHeight && t.top - 4 - m.height >= 0) top = t.top - 4 - m.height;
      left = Math.max(8, Math.min(left, window.innerWidth - m.width - 8));
      setPosition({ left, top });
    };
    const clickAway = (event: MouseEvent) => {
      if (!trigger.current?.contains(event.target as Node)) setOpen(false);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    document.addEventListener("click", clickAway);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      document.removeEventListener("click", clickAway);
    };
  }, [open, placement]);

  const style = {
    display: open ? "block" : "none",
    ...(open && position ? { position: "fixed" as const, left: `${position.left}px`, top: `${position.top}px` } : {}),
  };

  return { open, toggle: () => setOpen((value) => !value), trigger, menu, style };
}

export function Dropdown({
  id,
  className,
  dropdownClass,
  placement = "bottom-end",
  items,
  children,
}: {
  id?: string;
  className?: string;
  dropdownClass?: string;
  placement?: DropdownPlacement;
  items: ReactNode;
  children: ReactNode;
}) {
  const { open, toggle, trigger, menu, style } = useDropdown(placement);

  return (
    <div id={id} className={cx("relative", className)} data-placement={placement}>
      <div
        ref={(node) => { trigger.current = node; }}
        data-button
        aria-expanded={open}
        className="cursor-pointer"
        onClick={toggle}
      >
        {children}
      </div>

      <nav ref={(node) => { menu.current = node; }} className={cx("absolute z-[9999]", dropdownClass)} style={style} data-dropdown-menu>
        <div className="p-1 mt-1 bg-white border rounded-md shadow-md border-neutral-200/70 text-neutral-900 min-w-56">{items}</div>
      </nav>
    </div>
  );
}

export function DropdownMenu({ id, items }: { id: string; items: ReactNode[] }) {
  const { open, toggle, trigger, menu, style } = useDropdown("bottom");

  return (
    <div id={id} className="relative">
      <button
        ref={(node) => { trigger.current = node; }}
        type="button"
        data-button
        aria-expanded={open}
        className="cursor-pointer"
        onClick={toggle}
      >
        <div className="transition-transform p-3 flex items-center justify-center">
          <Icon className="font-semibold text-xl" name="fa-ellipsis-vertical" />
        </div>
      </button>

      <nav ref={(node) => { menu.current = node; }} className="absolute z-[9999]" style={style} data-dropdown-menu>
        <ul className="mt-1 bg-white shadow rounded border border-neutral-200/70 min-w-48">
          {items.map((item, index) => (
            <li
              key={index}
              className={cx(
                "[&>*]:px-4 [&>*]:py-2 text-neutral/70 hover:bg-brand-purple-dark/10",
                "[&>*]:block [&>*]:text-left [&>*]:w-full [&>*]:h-full",
                "[&>*]:text-left [&>*]:w-full [&>*]:h-full",
                "[&>*]:cursor-pointer",
              )}
            >
              {item}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
