import {
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { Icon } from "./Icon.js";

export type ActionVariant = "default" | "outline" | "tint" | "ghost";
export type LinkButtonColor = "blue" | "red" | "purple";
export type CopyButtonColor = LinkButtonColor | "green";
export type CopyButtonSize = "small" | "normal";

const LINK_VARIANT: Record<ActionVariant, Record<LinkButtonColor, string> | string> = {
  default: {
    blue: "bg-[var(--color-brand-blue)] text-white",
    red: "bg-[var(--color-red)] text-white",
    purple: "",
  },
  outline: {
    blue: "border border-[var(--color-blue)] text-[var(--color-blue)]",
    red: "border border-[var(--color-red)] text-[var(--color-red)]",
    purple: "border",
  },
  tint: {
    blue: "bg-[var(--color-blue-light)] text-[var(--color-blue-dark)]",
    red: "bg-[var(--color-red-light)] text-[var(--color-red-dark)]",
    purple: "bg-[var(--color-purple-light)] text-[var(--color-purple)]",
  },
  ghost: "text-[var(--color-neutral-600)]",
};

const COPY_VARIANT: Record<ActionVariant, Record<CopyButtonColor, string> | string> = {
  default: {
    blue: "bg-[var(--color-blue)] text-white",
    red: "bg-[var(--color-red)] text-white",
    green: "bg-[var(--color-green)] text-white",
    purple: "bg-[var(--color-purple)] text-white",
  },
  outline: {
    blue: "border border-[var(--color-blue)] text-[var(--color-blue)]",
    red: "border border-[var(--color-red)] text-[var(--color-red)]",
    green: "border border-[var(--color-green)] text-[var(--color-green)]",
    purple: "border border-[var(--color-purple)] text-[var(--color-purple)]",
  },
  tint: {
    blue: "bg-[var(--color-blue-light)] text-[var(--color-blue-dark)]",
    red: "bg-[var(--color-red-light)] text-[var(--color-red-dark)]",
    green: "bg-[var(--color-green-light)] text-[var(--color-green-dark)]",
    purple: "bg-[var(--color-purple-light)] text-[var(--color-purple)]",
  },
  ghost: "text-[var(--color-neutral-600)]",
};

function variantClass<C extends string>(table: Record<ActionVariant, Record<C, string> | string>, variant: ActionVariant, color: C) {
  const value = table[variant];
  return typeof value === "string" ? value : value[color];
}

type GlobalAttributes<T> = Omit<HTMLAttributes<T>, "children" | "className" | "color" | "onClick">;
type LinkSpecificAttributes = Pick<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "download" | "hrefLang" | "referrerPolicy" | "rel" | "target" | "type"
>;
type CopySpecificAttributes = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled" | "form" | "name" | "value"
>;

/**
 * Link com aparência de botão — espelho de `CoreComponents.link_button/1`.
 * A versão React degrada a navegação LiveView para `<a href>`, preservando a
 * semântica e o teclado nativos. `navigate` é opcional como no attr original.
 */
export function LinkButton({
  navigate,
  variant = "default",
  color = "blue",
  leftIcon,
  rightIcon,
  className,
  children,
  ...rest
}: {
  navigate?: string;
  variant?: ActionVariant;
  color?: LinkButtonColor;
  leftIcon?: string;
  rightIcon?: string;
  children: ReactNode;
  className?: string;
  onClick?: AnchorHTMLAttributes<HTMLAnchorElement>["onClick"];
} & GlobalAttributes<HTMLAnchorElement> & LinkSpecificAttributes) {
  return (
    <a
      href={navigate}
      className={[
        "flex h-12 items-baseline rounded-lg px-4 py-3 font-bold",
        color === "purple" && "bg-[var(--color-brand-accent)] text-white",
        variantClass(LINK_VARIANT, variant, color),
        className,
      ].filter(Boolean).join(" ")}
      {...rest}
    >
      {leftIcon && <Icon name={leftIcon} className="mr-2" />}
      {children}
      {rightIcon && <Icon name={rightIcon} className="ml-2" />}
    </a>
  );
}

export const COPY_TOAST_EVENT = "phx:show-toast";

export type ToastEventDetail = {
  title: string;
  content: string;
  type: "success";
};

type ToastNotice = ToastEventDetail & { id: number };

/** Host global único dos toasts persistentes publicados pelos hooks. */
export function ToastHost() {
  const [notices, setNotices] = useState<ToastNotice[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const receiveToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastEventDetail>).detail;
      const id = ++nextId.current;
      setNotices((current) => [...current, { id, ...detail }]);
    };
    window.addEventListener(COPY_TOAST_EVENT, receiveToast);
    return () => window.removeEventListener(COPY_TOAST_EVENT, receiveToast);
  }, []);

  return (
    <div data-toast-host className="fixed bottom-8 right-8 z-50 flex flex-col gap-2" aria-live="polite" aria-atomic="false">
      {notices.map((notice) => (
        <div key={notice.id} data-toast-id={notice.id} data-type={notice.type} className="relative w-80 overflow-hidden rounded-lg bg-[var(--color-cyan-light)] p-3 shadow-[var(--shadow-main)]">
          <p className="m-0 text-sm font-semibold leading-6 text-[var(--color-brand-purple-dark)]">{notice.title}</p>
          <p className="m-0 text-sm leading-5 text-[var(--color-brand-purple-dark)]/80">{notice.content}</p>
          <button type="button" className="group absolute right-1 top-1 rounded p-2" aria-label={`Fechar ${notice.title}`} onClick={() => setNotices((current) => current.filter(({ id }) => id !== notice.id))}>
            <Icon name="fa-times" className="h-5 w-5 opacity-40 group-hover:opacity-70" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Botão que copia e publica imediatamente um toast no host global. */
export function CopyButton({
  id,
  textToCopy,
  variant = "default",
  color = "blue",
  size = "normal",
  leftIcon,
  rightIcon,
  className,
  children,
  onClick,
  ...rest
}: {
  id: string;
  textToCopy: string;
  variant?: ActionVariant;
  color?: CopyButtonColor;
  size?: CopyButtonSize;
  leftIcon?: string;
  rightIcon?: string;
  children: ReactNode;
  className?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
} & GlobalAttributes<HTMLButtonElement> & CopySpecificAttributes) {
  return (
    <button
      id={id}
      type="button"
      data-text={textToCopy}
      className={[
        "flex justify-center rounded-lg font-bold transition duration-200 ease-in-out active:scale-95",
        size === "normal" ? "h-12 items-baseline px-4 py-3" : "h-8 items-center px-2 py-2.5 text-sm",
        variantClass(COPY_VARIANT, variant, color),
        className,
      ].filter(Boolean).join(" ")}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !textToCopy) return;
        void navigator.clipboard.writeText(textToCopy);
        window.dispatchEvent(new CustomEvent<ToastEventDetail>(COPY_TOAST_EVENT, {
          detail: {
            title: "Copiado!",
            content: "Texto copiado para area de transferência",
            type: "success",
          },
        }));
      }}
      {...rest}
    >
      {leftIcon && <Icon name={leftIcon} className="mr-2" />}
      {children}
      {rightIcon && <Icon name={rightIcon} className="ml-2" />}
    </button>
  );
}
