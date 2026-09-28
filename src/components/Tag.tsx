import { Icon } from "./Icon.js";

/**
 * `core_components.ex` → `tag/1`.
 * `light-red` está nos valores do attr, mas o original não tem classe para ela.
 */
export type TagVariant =
  | "light-blue"
  | "blue"
  | "dark-blue"
  | "cyan"
  | "light-accent"
  | "purple"
  | "light-purple"
  | "dark-purple"
  | "light-red"
  | "red"
  | "brand"
  | "green"
  | "yellow"
  | "orange";

export function Tag({
  item,
  title,
  variant = "light-blue",
  className,
  pill = false,
  leftIcon,
  icon,
}: {
  item: string;
  title?: string;
  variant?: TagVariant;
  className?: string;
  pill?: boolean;
  leftIcon?: string;
  icon?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 py-0.5 text-sm",
        pill ? "rounded-full px-3 font-bold" : "rounded px-1.5 font-semibold",
        variant === "light-blue" && "bg-blue-light text-blue",
        variant === "blue" && "bg-blue text-blue-light",
        variant === "dark-blue" && "bg-brand-blue/16 text-brand-blue-dark",
        variant === "cyan" && "bg-cyan text-white",
        variant === "light-accent" && "bg-brand-accent/14 text-brand-accent-dark",
        variant === "purple" && "bg-purple text-white",
        variant === "light-purple" && "bg-purple-light text-purple",
        variant === "dark-purple" && "bg-brand-purple-dark/6 text-brand-purple-dark",
        variant === "red" && "bg-red-light text-red",
        variant === "orange" && "bg-brand-orange/20 text-orange-dark",
        variant === "brand" && "bg-brand-purple-dark/20 text-brand-purple-dark/80",
        variant === "green" && "bg-brand-green/20 text-brand-green-dark",
        variant === "yellow" && "bg-yellow/20 text-yellow-dark",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={title}
    >
      {leftIcon && <Icon name={leftIcon} />}
      {item}
      {icon && <Icon name={icon} />}
    </span>
  );
}

export type TagListVariant = "light-blue" | "blue" | "red" | "light-purple" | "orange";

/** `core_components.ex` → `tag_list/1`. */
export function TagList({
  items,
  limit = 0,
  variant = "light-blue",
  className,
}: {
  items: string[];
  limit?: number;
  variant?: TagListVariant;
  className?: string;
}) {
  const visibleItems = limit > 0 ? items.slice(0, limit) : items;
  const hiddenItems = limit > 0 ? items.slice(limit) : [];

  return (
    <div className={["flex gap-1.5", className].filter(Boolean).join(" ")}>
      {visibleItems.map((item, index) => (
        <Tag key={index} item={item} variant={variant} />
      ))}
      {hiddenItems.length > 0 && (
        <Tag item={`+${hiddenItems.length}`} title={hiddenItems.join(", ")} variant={variant} />
      )}
    </div>
  );
}

/** `core_components.ex` → `status_tag/1`. */
export function StatusTag({
  status,
  title,
  className,
}: {
  status: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={["w-2.5 h-2.5 rounded-full inline-block", status ? "bg-green" : "bg-red", className]
        .filter(Boolean)
        .join(" ")}
    ></span>
  );
}
