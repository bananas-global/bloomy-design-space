import type { ReactNode } from "react";
import { Icon } from "./Icon.js";

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
 * **Botão só com ícone pede `self-center` no ícone.** O tamanho `normal` alinha
 * por `items-baseline`, e um ícone sem texto ao lado não tem linha de base a
 * seguir: ele sobe alguns pixels acima do centro. Não é defeito do espelho — o
 * monólito faz o mesmo, e resolve no ponto de uso, com
 * `<.icon class="self-center" />`. Está assim em `custom_services/update.ex`,
 * `chat_live/chat_modal.ex` e `skill_acquisition.ex`, entre outros.
 *
 * O `Button` anterior desta pasta era invenção minha, com `variant="danger"` e
 * `unavailableReason`. Ele continua existindo em `primitives.tsx` enquanto as 48
 * telas não são convertidas — as duas coisas convivem de propósito durante a
 * troca, e não depois.
 */

export type ButtonVariant = "default" | "outline" | "tint" | "ghost";

/**
 * `brand` **não existe em `button/1`** — é extensão da decisão 0015.
 *
 * As cinco cores do original são todas de sinal: azul de ação, vermelho de
 * perigo, verde, roxo, amarelo. Faltava a cor de nenhum sinal — o botão de ação
 * repetida, que aparece uma vez por item de uma lista e não deve competir com a
 * ação da página. Nos cartões da pasta de documentos, "Editar" em `tint` azul
 * pintava onze botões da mesma cor do "Adicionar documento" do cabeçalho.
 *
 * Só `tint` tem ramo `brand`. `default` em cima do roxo escuro seria um segundo
 * botão primário, que é exatamente o que esta cor existe para não ser.
 */
export type ButtonColor = "blue" | "red" | "green" | "purple" | "yellow" | "brand";
export type ButtonSize = "small" | "medium" | "normal";

const TAMANHO: Record<ButtonSize, string> = {
  normal: "h-12 px-4 py-3 items-baseline",
  small: "h-8 min-w-8 px-2 py-2.5 text-sm items-center",
  medium: "h-9 min-w-9 px-2 py-2.5 text-sm items-center",
};

/** Cor de fallback quando a variante não tem ramo próprio para `brand`. */
const SEM_RAMO_BRAND = "bg-[var(--color-brand-blue)] text-white";

const VARIANTE: Record<ButtonVariant, Record<ButtonColor, string> | string> = {
  default: {
    blue: "bg-[var(--color-brand-blue)] text-white",
    red: "bg-[var(--color-red)] text-white",
    green: "bg-[var(--color-green)] text-white",
    purple: "bg-[var(--color-purple)] text-white",
    yellow: "bg-[var(--color-yellow)] text-black",
    brand: SEM_RAMO_BRAND,
  },
  outline: {
    blue: "border border-[var(--color-blue)] text-[var(--color-blue)]",
    red: "border border-[var(--color-red)] text-[var(--color-red)]",
    green: "border border-[var(--color-green)] text-[var(--color-green)]",
    purple: "border border-[var(--color-purple)] text-[var(--color-purple)]",
    yellow: "border border-[var(--color-yellow)] text-[var(--color-yellow)]",
    brand:
      "border border-[var(--color-brand-purple-dark)]/20 text-[var(--color-brand-purple-dark)]",
  },
  tint: {
    blue: "bg-[var(--color-blue-light)] text-[var(--color-blue-dark)]",
    red: "bg-[var(--color-red-light)] text-[var(--color-red-dark)]",
    green: "bg-[var(--color-green-light)] text-[var(--color-green-dark)]",
    purple: "bg-[var(--color-purple-light)] text-[var(--color-purple-dark)]",
    yellow: "bg-[var(--color-yellow)]/20 text-[var(--color-yellow-dark)]",
    // O par do `tag/1` variante `brand`, que é a etiqueta sem sinal do sistema —
    // só com o fundo mais claro, porque aqui ele carrega texto de 14px em negrito
    // e não uma palavra de etiqueta.
    brand:
      "bg-[var(--color-brand-purple-dark)]/8 text-[var(--color-brand-purple-dark)] hover:bg-[var(--color-brand-purple-dark)]/12",
  },
  /* O original é `bg-transparent text-neutral-600 hover:bg-brand-purple-dark/5`.
     O fundo e o realce de passagem faltavam aqui: sem eles o botão fantasma não
     respondia ao ponteiro e não se distinguia de um texto solto ao lado de um
     botão de verdade. */
  ghost:
    "bg-transparent text-[var(--color-neutral-600)] hover:bg-[var(--color-brand-purple-dark)]/5",
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
