import type { ReactNode } from "react";
import { Icon } from "../Icon.js";

/**
 * Botão — espelho de `CoreComponents.button/1`.
 *
 * Quatro variantes, cinco cores, três tamanhos: sessenta combinações, todas
 * portadas na tabela de classes abaixo, na mesma ordem do original.
 *
 * ```elixir
 * attr :variant, :string, default: "default", values: ~w(default outline tint ghost)
 * attr :color, :string, default: "blue", values: ~w(blue red green purple yellow)
 * attr :size, :string, default: "normal", values: ~w(small medium normal)
 * ```
 *
 * **Duas coisas que o espelho traz junto e vale saber.**
 *
 * O primário — `variant="default" color="blue"` — é `bg-brand-blue text-white`,
 * o mesmo par de 2,22:1 do achado 99. É o botão de ação principal do sistema
 * inteiro, então o problema de contraste do menu vale para ele também.
 *
 * E `color="yellow"` no `outline` e no `tint` usa o amarelo como **texto**:
 * `#ffc402` sobre branco dá 1,68:1. Está registrado no achado 101.
 *
 * O `Button` anterior desta pasta era invenção minha, com `variant="danger"` e
 * `unavailableReason`. Ele continua existindo em `primitives.tsx` enquanto as 48
 * telas não são convertidas — as duas coisas convivem de propósito durante a
 * troca, e não depois.
 */

export type ButtonVariant = "default" | "outline" | "tint" | "ghost";
export type ButtonColor = "blue" | "red" | "green" | "purple" | "yellow";
export type ButtonSize = "small" | "medium" | "normal";

const TAMANHO: Record<ButtonSize, string> = {
  normal: "h-12 px-4 py-3 items-baseline",
  small: "h-8 min-w-8 px-2 py-2.5 text-sm items-center",
  medium: "h-9 min-w-9 px-2 py-2.5 text-sm items-center",
};

const VARIANTE: Record<ButtonVariant, Record<ButtonColor, string> | string> = {
  default: {
    blue: "bg-[var(--color-brand-blue)] text-white",
    red: "bg-[var(--color-red)] text-white",
    green: "bg-[var(--color-green)] text-white",
    purple: "bg-[var(--color-purple)] text-white",
    yellow: "bg-[var(--color-yellow)] text-black",
  },
  outline: {
    blue: "border border-[var(--color-blue)] text-[var(--color-blue)]",
    red: "border border-[var(--color-red)] text-[var(--color-red)]",
    green: "border border-[var(--color-green)] text-[var(--color-green)]",
    purple: "border border-[var(--color-purple)] text-[var(--color-purple)]",
    yellow: "border border-[var(--color-yellow)] text-[var(--color-yellow)]",
  },
  tint: {
    blue: "bg-[var(--color-blue-light)] text-[var(--color-blue-dark)]",
    red: "bg-[var(--color-red-light)] text-[var(--color-red-dark)]",
    green: "bg-[var(--color-green-light)] text-[var(--color-green-dark)]",
    purple: "bg-[var(--color-purple-light)] text-[var(--color-purple-dark)]",
    yellow: "bg-[var(--color-yellow)]/20 text-[var(--color-yellow-dark)]",
  },
  ghost: "text-[var(--color-neutral-600)]",
};

export function Button({
  variant = "default",
  color = "blue",
  size = "normal",
  leftIcon,
  rightIcon,
  iconType = "regular",
  notificationBadge = false,
  className,
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  leftIcon?: string;
  rightIcon?: string;
  iconType?: "regular" | "solid";
  notificationBadge?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">) {
  const daVariante = VARIANTE[variant];

  return (
    <button
      className={[
        "relative rounded-lg font-bold transition duration-200 ease-in-out active:scale-95",
        "disabled:active:scale-100",
        "flex justify-center",
        TAMANHO[size],
        typeof daVariante === "string" ? daVariante : daVariante[color],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {notificationBadge && (
        <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-yellow)] text-white">
          <Icon name="fa-bell" className="text-xs" />
        </span>
      )}
      {leftIcon && <Icon name={leftIcon} type={iconType} className="mr-2" />}
      {children}
      {rightIcon && <Icon name={rightIcon} type={iconType} className="ml-2" />}
    </button>
  );
}
