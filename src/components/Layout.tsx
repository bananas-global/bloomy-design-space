import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon.js";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** `core_components.ex` → `header/1`. */
export function Header({
  className,
  variant = "default",
  children,
  subtitle,
  actions,
}: {
  className?: string;
  variant?: "small" | "default" | "large";
  children: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header
      className={cx(
        actions != null && "flex flex-col md:flex-row items-center justify-between gap-6",
        "text-brand-purple-dark",
        className,
      )}
    >
      <div>
        <h1
          className={cx(
            (variant === "small" || variant === "default") && "font-bold",
            variant === "large" && "font-extrabold",
            variant === "small" && "text-lg",
            variant === "default" && "text-2xl",
            variant === "large" && "text-3xl",
          )}
        >
          {children}
        </h1>
        {subtitle != null && <p className="mt-2 text-sm leading-6 text-neutral-900">{subtitle}</p>}
      </div>
      <div className="flex-none space-x-4">{actions}</div>
    </header>
  );
}

/** O slot `:item` de `list/1`: `title` e o conteúdo. */
export type ListItem = { title: string; children: ReactNode };

/** `core_components.ex` → `list/1`. */
export function List({ item }: { item: ListItem[] }) {
  return (
    <div className="mt-14">
      <dl className="-my-4 divide-y divide-neutral-100">
        {item.map((it, index) => (
          <div key={index} className="flex gap-4 py-4 text-sm leading-6 sm:gap-8">
            <dt className="w-1/4 flex-none text-neutral-500">{it.title}</dt>
            <dd className="text-neutral-700">{it.children}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** `core_components.ex` → `back/1`. `<.link navigate>` vira `<a href>`. */
export function Back({ navigate, children }: { navigate: string; children: ReactNode }) {
  return (
    <div className="mt-16">
      <a href={navigate} className="text-sm font-semibold leading-6 text-neutral-900 hover:text-neutral-700">
        <Icon name="fa-arrow-left" className="h-3 w-3" /> {children}
      </a>
    </div>
  );
}

/** Os campos de `Flop.Meta` que `meta_info/1` lê. */
export type Meta = { totalCount: number; currentOffset: number; pageSize: number };

/** `core_components.ex` → `meta_info/1`. */
export function MetaInfo({ meta }: { meta: Meta }) {
  const startCount = meta.totalCount === 0 ? 0 : meta.currentOffset + 1;
  const endCount = Math.min(meta.currentOffset + meta.pageSize, meta.totalCount);

  return (
    <p className="text-brand-purple-dark/80">
      Mostrando {startCount} até {endCount} de {meta.totalCount} registros
    </p>
  );
}

/** `core_components.ex` → `inside_card/1`. */
export function InsideCard({
  title,
  subtitle,
  value,
  className,
  icon,
}: {
  title?: string;
  subtitle?: string;
  value?: string;
  className?: string;
  icon?: string;
}) {
  return (
    <div
      className={cx(
        "flex items-center justify-between bg-brand-purple-dark/5 rounded-xl border border-brand-purple-dark/10 w-full p-4",
        className,
      )}
    >
      <div className="flex items-center gap-x-2">
        <div className="flex justify-center items-center text-2xl text-brand-purple-dark/60 w-7.5 h-7.5">
          {icon && <Icon name={icon} type="regular" />}
        </div>
        <div>
          <p className="text-base/4 font-bold text-brand-purple-dark/90">{title}</p>
          <p className="text-xs text-brand-purple-dark/60">{subtitle}</p>
        </div>
      </div>
      <div className="text-2xl font-bold text-brand-purple-dark">{value}</div>
    </div>
  );
}

/** `core_components.ex` → `empty_state_card/1`. */
export function EmptyStateCard({
  icon,
  text,
  className,
  children,
}: {
  icon: string;
  text: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx("p-6 flex flex-col items-center text-center", className)}>
      <div className="w-32 h-32 flex items-center justify-center rounded-full bg-neutral-50 text-neutral-400 mb-6">
        <Icon name={icon} className="text-6xl" />
      </div>

      <p className="text-2xl font-extrabold text-brand-purple-dark max-w-4xl">{text}</p>

      {children != null && <div className="text-brand-purple-dark/80 mt-2">{children}</div>}
    </div>
  );
}

/** `core_components.ex` → `loading_card/1`. */
export function LoadingCard({ message }: { message: string }) {
  return (
    <div className={cx("flex items-center justify-center gap-4", "border p-4 border-brand-purple-dark/10 rounded-2xl")}>
      <p className="text-brand-purple-dark/60">{message}</p>
      <Icon className="animate-spin text-brand-blue text-4xl" name="fa-spinner-third" />
    </div>
  );
}

/** O slot `:item` de `timeline_list/1`: `icon`, `color` e o conteúdo. */
export type TimelineListItem = { icon?: string; color?: "blue" | "green"; children: ReactNode };

/** `core_components.ex` → `timeline_list/1`. */
export function TimelineList({ item }: { item: TimelineListItem[] }) {
  return (
    <ol className="relative border-s border-brand-purple-dark/10">
      {item.map((it, index) => (
        <li key={index} className="mb-10 ms-6">
          <div className="absolute -start-4 bg-white rounded-full">
            <span
              className={cx(
                "relative flex items-center justify-center w-8 h-8 rounded-full ring-8 ring-white",
                it.color === "blue" && "bg-brand-blue/20 text-brand-blue-dark",
                it.color === "green" && "bg-brand-green/20 text-brand-green-dark",
              )}
            >
              {it.icon && <Icon name={it.icon} className="text-sm" />}
            </span>
          </div>

          {it.children}
        </li>
      ))}
    </ol>
  );
}

export type AvatarSize = "extra_small" | "small" | "medium" | "extra_medium" | "large" | "extra_large" | "custom";

/**
 * `core_components.ex` → `avatar/1`.
 * Os átomos do Phoenix (`:small`, `:round`) viram strings.
 */
export function Avatar({
  imageUrl,
  size = "small",
  shape = "round",
  title,
  className,
  style,
}: {
  imageUrl?: string;
  size?: AvatarSize;
  shape?: "round" | "square";
  title?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      title={title}
      style={style}
      className={cx(
        "bg-blue overflow-hidden flex-shrink-0",
        shape === "round" && "rounded-full",
        shape === "square" && "rounded-lg",
        size === "extra_small" && "h-4 w-4",
        size === "small" && "h-5 w-5",
        size === "medium" && "h-10 w-10",
        size === "extra_medium" && "h-12 w-12",
        size === "large" && "h-20 w-20",
        size === "extra_large" && "h-24 w-24",
        className,
      )}
    >
      {imageUrl && <img src={imageUrl} className="w-full h-full object-cover" />}
    </div>
  );
}

/** `core_components.ex` → `progress/1`. */
export function Progress({
  value,
  variant = "default",
  showPercentage = true,
  className,
  ...rest
}: {
  value: number;
  variant?: "default" | "error" | "purple" | "accent";
  showPercentage?: boolean;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  return (
    <div className={cx("flex items-baseline gap-3", className)} {...rest}>
      <div
        className={cx(
          "w-full bg-blue/20 rounded-full h-2",
          variant === "default" && "bg-blue/20",
          variant === "accent" && "bg-brand-accent/20",
          variant === "error" && "bg-red/20",
        )}
      >
        <div
          className={cx(
            "bg-blue h-2 rounded-full transition-all duration-1000 ease-linear",
            variant === "default" && "bg-blue",
            variant === "purple" && "bg-purple",
            variant === "accent" && "bg-brand-accent",
            variant === "error" && "bg-red",
          )}
          style={{ width: `${value}%` }}
        ></div>
      </div>
      {showPercentage && <p className="text-blue-dark">{value}%</p>}
    </div>
  );
}

/** `core_components.ex` → `kbd/1`. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="font-extrabold text-[9.5px] tracking-wider uppercase h-4.5 leading-4.5 bg-white rounded-md border border-brand-purple-dark/20 text-brand-purple-dark/50 px-1">
      {children}
    </kbd>
  );
}
