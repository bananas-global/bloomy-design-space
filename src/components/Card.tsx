import type { ReactNode } from "react";
import { Icon } from "./Icon.js";

/** `extract_bg_class/1`: sem `bg-*` na classe, o cartão é branco. */
function extractBgClass(className: string | undefined): string {
  if (className == null) return "bg-white";
  return /\bbg-[a-z0-9_-]+(?:\/[0-9]+)?\b/.test(className) ? "" : "bg-white";
}

/** `core_components.ex` → `card/1`. */
export function Card({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className={[`rounded-2xl ${extractBgClass(className)} p-6 shadow-main flex-col md:flex-row gap-4`, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export type InfoCardVariant = "blue" | "orange" | "accent" | "green" | "info";

const INFO_CARD_COLORS: Record<InfoCardVariant, [string, string]> = {
  blue: ["bg-brand-blue/20", "text-brand-blue-dark"],
  orange: ["bg-brand-orange/20", "text-brand-orange-dark"],
  accent: ["bg-brand-accent/20", "text-brand-accent-dark"],
  green: ["bg-brand-green/20", "text-brand-green-dark"],
  info: ["bg-brand-info/20", "text-brand-info-dark"],
};

/**
 * `core_components.ex` → `info_card/1`.
 * Como no original, `class` é aceito mas não é aplicado.
 */
export function InfoCard({
  title,
  info,
  variant,
  icon,
}: {
  title?: string;
  info?: string;
  variant: InfoCardVariant;
  className?: string;
  icon?: string;
}) {
  const [backgroundColor, textColor] = INFO_CARD_COLORS[variant];

  return (
    <div className="flex gap-4 items-center">
      <div className={`flex justify-center items-center h-8 w-8 rounded ${backgroundColor}`}>
        {icon && <Icon name={icon} type="solid" className={textColor} />}
      </div>

      <div>
        {info ? (
          <p className={`font-extrabold text-xl/4 ${textColor}`}>{info}</p>
        ) : (
          <div className="h-4 bg-brand-purple-dark/20 rounded animate-pulse mb-1 w-16"></div>
        )}

        <p className="text-sm text-brand-purple-dark">{title}</p>
      </div>
    </div>
  );
}
