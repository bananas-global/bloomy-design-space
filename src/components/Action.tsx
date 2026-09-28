import {
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Icon } from "./Icon.js";

export type LinkButtonVariant = "default" | "outline" | "tint" | "ghost";
export type LinkButtonColor = "blue" | "red" | "purple";

/**
 * `core_components.ex` → `link_button/1`.
 * `<.link navigate>` vira `<a href>`. Como no original, `color="purple"` pinta
 * `bg-brand-accent text-white` em qualquer variante.
 */
export function LinkButton({
  variant = "default",
  color = "blue",
  className,
  navigate,
  rightIcon,
  leftIcon,
  children,
  ...rest
}: {
  variant?: LinkButtonVariant;
  color?: LinkButtonColor;
  className?: string;
  navigate?: string;
  rightIcon?: string;
  leftIcon?: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "color" | "className" | "children">) {
  return (
    <a
      href={navigate}
      className={[
        "phx-submit-loading:opacity-75 h-12 rounded-lg px-4 py-3 font-bold",
        "flex items-baseline",
        variant === "default" && [color === "blue" && "bg-brand-blue text-white", color === "red" && "bg-red text-white"],
        [color === "purple" && "bg-brand-accent text-white"],
        variant === "outline" && [
          "border",
          color === "blue" && "border-blue text-blue",
          color === "red" && "border-red text-red",
        ],
        variant === "tint" && [
          color === "blue" && "bg-blue-light text-blue-dark",
          color === "red" && "bg-red-light text-red-dark",
          color === "purple" && "bg-purple-light text-purple",
        ],
        variant === "ghost" && "text-neutral-600",
        className,
      ]
        .flat()
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {leftIcon && <Icon name={leftIcon} className="mr-2" />}
      {children}
      {rightIcon && <Icon name={rightIcon} className="ml-2" />}
    </a>
  );
}

export type CopyButtonVariant = "default" | "outline" | "tint" | "ghost";
export type CopyButtonColor = "blue" | "red" | "green" | "purple";
export type CopyButtonSize = "small" | "normal";

/**
 * `core_components.ex` → `copy_button/1`.
 * O hook `CopyButton` (`assets/js/hooks/copy_button.js`) vira o `onClick`: copia
 * `data-text` e dispara `phx:show-toast`, que o `ToastWrapper` escuta.
 */
export function CopyButton({
  id,
  variant = "default",
  color = "blue",
  size = "normal",
  className,
  rightIcon,
  leftIcon,
  title,
  textToCopy,
  children,
  onClick,
  ...rest
}: {
  id: string;
  variant?: CopyButtonVariant;
  color?: CopyButtonColor;
  size?: CopyButtonSize;
  className?: string;
  rightIcon?: string;
  leftIcon?: string;
  title?: string;
  textToCopy: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "id" | "type" | "color" | "title" | "className" | "children">) {
  return (
    <button
      id={id}
      title={title}
      type="button"
      data-text={textToCopy}
      className={[
        "phx-submit-loading:opacity-75 rounded-lg font-bold transition duration-200 ease-in-out active:scale-95",
        "flex justify-center",
        size === "normal" && "h-12 px-4 py-3 items-baseline",
        size === "small" && "h-8 px-2 py-2.5 text-sm items-center",
        variant === "default" && [
          color === "blue" && "bg-blue text-white",
          color === "red" && "bg-red text-white",
          color === "green" && "bg-green text-white",
          color === "purple" && "bg-purple text-white",
        ],
        variant === "outline" && [
          "border",
          color === "blue" && "border-blue text-blue",
          color === "red" && "border-red text-red",
          color === "green" && "border-green text-green",
          color === "purple" && "border-purple text-purple",
        ],
        variant === "tint" && [
          color === "blue" && "bg-blue-light text-blue-dark",
          color === "red" && "bg-red-light text-red-dark",
          color === "green" && "bg-green-light text-green-dark",
          color === "purple" && "bg-purple-light text-purple",
        ],
        variant === "ghost" && "text-neutral-600",
        className,
      ]
        .flat()
        .filter(Boolean)
        .join(" ")}
      onClick={(event) => {
        onClick?.(event);
        if (!textToCopy) return;
        void navigator.clipboard?.writeText(textToCopy);
        showToast({ title: "Copiado!", content: "Texto copiado para area de transferência", type: "success" });
      }}
      {...rest}
    >
      {leftIcon && <Icon name={leftIcon} className="mr-2" />}
      {children}
      {rightIcon && <Icon name={rightIcon} className="ml-2" />}
    </button>
  );
}

export const SHOW_TOAST_EVENT = "phx:show-toast";

export type ToastType = "success" | "error" | "info";

export type ToastDetail = {
  title: string;
  content: string;
  type: ToastType;
  /** Em milissegundos. Sem ele, o toast fica até ser fechado. */
  closeTime?: number;
};

/** Equivalente ao `push_event(socket, "show-toast", …)` do servidor. */
export function showToast(detail: ToastDetail) {
  window.dispatchEvent(new CustomEvent<ToastDetail>(SHOW_TOAST_EVENT, { detail }));
}

/**
 * `backoffice_components.ex` → `toast_wrapper/1`.
 * O hook `ToastController` (`assets/js/hooks/toast_controller.js`) vira estado
 * React: cada `phx:show-toast` acrescenta um item do `<template id="toast_item">`.
 */
export function ToastWrapper() {
  const [toasts, setToasts] = useState<(ToastDetail & { key: number })[]>([]);
  const nextKey = useRef(0);

  useEffect(() => {
    const onShow = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      const key = ++nextKey.current;
      setToasts((current) => [...current, { ...detail, key }]);
    };
    window.addEventListener(SHOW_TOAST_EVENT, onShow);
    return () => window.removeEventListener(SHOW_TOAST_EVENT, onShow);
  }, []);

  return (
    <div id="toast_wrapper" className="fixed bottom-8 right-8 z-50 flex flex-col gap-2">
      {toasts.map(({ key: toastKey, ...toast }) => (
        <ToastItem
          key={toastKey}
          {...toast}
          onRemove={() => setToasts((current) => current.filter(({ key }) => key !== toastKey))}
        />
      ))}
    </div>
  );
}

function ToastItem({ title, content, type, closeTime, onRemove }: ToastDetail & { onRemove: () => void }) {
  const [shown, setShown] = useState(false);
  const [paused, setPaused] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const progressBar = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const hasTimer = Boolean(closeTime && closeTime > 0);

  const remove = () => {
    setShown(false);
    clearTimeout(timeout.current);
    setTimeout(onRemove, 200);
  };

  useEffect(() => {
    const enter = setTimeout(() => setShown(true), 100);
    if (hasTimer) timeout.current = setTimeout(remove, closeTime);
    return () => {
      clearTimeout(enter);
      clearTimeout(timeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-type={type}
      className={[
        "relative overflow-hidden",
        "rounded-lg p-3 shadow-main w-80",
        "transition duration-200 ease-in-out",
        "data-[type=success]:bg-cyan-light",
        "data-[type=error]:bg-red-light",
        "data-[type=info]:bg-purple-light",
        "group/toast",
      ].join(" ")}
      style={{ transform: shown ? "translateX(0%)" : "translateX(120%)" }}
      onMouseEnter={() => {
        if (!hasTimer) return;
        setPaused(true);
        clearTimeout(timeout.current);
      }}
      onMouseLeave={() => {
        if (!hasTimer || !progress.current || !progressBar.current) return;
        setPaused(false);
        const percentComplete = progress.current.offsetWidth / progressBar.current.offsetWidth;
        timeout.current = setTimeout(remove, closeTime! * (1 - percentComplete));
      }}
    >
      <h1 className="text-sm font-semibold leading-6 text-brand-purple-dark">{title}</h1>
      <p className="text-sm leading-5 text-brand-purple-dark/80">{content}</p>

      <button data-close-button type="button" className="group absolute top-1 right-1 p-2" aria-label="close" onClick={remove}>
        <Icon name="fa-times" className="h-5 w-5 opacity-40 group-hover:opacity-70" />
      </button>

      <div
        ref={progressBar}
        className={[
          "progress-bar absolute bottom-0 left-0 right-0 h-1 bg-gray-200/30",
          "group-data-[type=info]/toast:bg-purple-light group-data-[type=info]/toast:[&>.progress]:bg-purple-dark",
          "group-data-[type=success]/toast:bg-cyan group-data-[type=success]/toast:[&>.progress]:bg-cyan-dark",
          "group-data-[type=error]/toast:bg-brand-red/60 group-data-[type=error]/toast:[&>.progress]:bg-brand-red/60",
        ].join(" ")}
        style={{ display: hasTimer ? "block" : "none" }}
      >
        <div
          ref={progress}
          className={["progress h-full w-full origin-left", hasTimer && "animate-progress"].filter(Boolean).join(" ")}
          style={hasTimer ? { animationDuration: `${closeTime}ms`, animationPlayState: paused ? "paused" : "running" } : undefined}
        />
      </div>
    </div>
  );
}
