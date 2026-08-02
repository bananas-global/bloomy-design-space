import type { ReactNode } from "react";
import { Icon } from "../Icon.js";

/**
 * Cartão, cartão de destaque e cartão aninhado — espelho de `card/1`,
 * `info_card/1` e `inside_card/1`.
 *
 * ```elixir
 * <div class={["rounded-2xl #{@bg_class} p-6 shadow-main flex-col md:flex-row gap-4", @class]}>
 * ```
 *
 * O `bg_class` vem de `extract_bg_class/1`: o cartão é branco **a menos que**
 * quem o usa já tenha passado uma classe de fundo. É uma regra pequena e vale
 * portar em vez de simplificar, porque ela é o que permite os cartões coloridos
 * do produto sem uma propriedade a mais.
 */

/** Reproduz `extract_bg_class/1`: sem `bg-*` na classe, o cartão é branco. */
function fundoPadrao(className: string | undefined): string {
  if (!className) return "bg-white";
  return /\bbg-[a-z0-9_-]+(?:\/[0-9]+)?\b/.test(className) ? "" : "bg-white";
}

export function Card({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className={[
        "rounded-2xl p-6 shadow-[var(--shadow-main)] flex-col md:flex-row gap-4",
        fundoPadrao(className),
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export type InfoCardVariant = "blue" | "orange" | "accent" | "green" | "info";

const INFO: Record<InfoCardVariant, { fundo: string; texto: string }> = {
  blue: { fundo: "bg-[var(--color-brand-blue)]/20", texto: "text-[var(--color-brand-blue-dark)]" },
  orange: {
    fundo: "bg-[var(--color-brand-orange)]/20",
    texto: "text-[var(--color-brand-orange-dark)]",
  },
  accent: {
    fundo: "bg-[var(--color-brand-accent)]/20",
    texto: "text-[var(--color-brand-accent-dark)]",
  },
  green: { fundo: "bg-[var(--color-brand-green)]/20", texto: "text-[var(--color-brand-green-dark)]" },
  info: { fundo: "bg-[var(--color-brand-info)]/20", texto: "text-[var(--color-brand-info-dark)]" },
};

/**
 * Cartão de destaque: ícone, número e rótulo.
 *
 * Sem `info`, o original mostra uma barra pulsando no lugar do número — estado
 * de carregamento embutido no componente, e não uma tela separada. Portado
 * assim de propósito: é o que a pessoa vê enquanto o painel carrega.
 */
export function InfoCard({
  title,
  info,
  variant,
  icon,
}: {
  title: string;
  info?: string;
  variant: InfoCardVariant;
  icon: string;
}) {
  const { fundo, texto } = INFO[variant];

  return (
    <div className="flex items-center gap-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded ${fundo}`}>
        <Icon name={icon} type="solid" className={texto} />
      </div>

      <div>
        {info ? (
          <p className={`m-0 text-xl/4 font-extrabold ${texto}`}>{info}</p>
        ) : (
          <div className="mb-1 h-4 w-16 animate-pulse rounded bg-[var(--color-brand-purple-dark)]/20" />
        )}
        <p className="m-0 text-sm text-[var(--color-brand-purple-dark)]">{title}</p>
      </div>
    </div>
  );
}
