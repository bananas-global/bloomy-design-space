import type { ReactNode } from "react";
import { Icon } from "../Icon.js";

/**
 * Estrutura e apoio — espelho de `header/1`, `list/1`, `back/1`, `meta_info/1`,
 * `inside_card/1`, `empty_state_card/1` e `loading_card/1`.
 *
 * São os componentes que dão forma à página entre o cartão e o campo. Nenhum
 * tem lógica; o que eles têm é medida — e é a medida que faz uma tela parecer
 * com o sistema ou não.
 */

/** `header/1`: título com três tamanhos e ações à direita. */
export function SectionHeader({
  variant = "default",
  subtitle,
  actions,
  className,
  children,
}: {
  variant?: "small" | "default" | "large";
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <header
      className={[
        actions && "flex flex-col items-center justify-between gap-6 md:flex-row",
        "text-[var(--color-brand-purple-dark)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div>
        <h1
          className={[
            variant === "large" ? "font-extrabold" : "font-bold",
            variant === "small" && "text-lg",
            variant === "default" && "text-2xl",
            variant === "large" && "text-3xl",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-6 text-[var(--color-neutral-900)]">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex-none space-x-4">{actions}</div>}
    </header>
  );
}

/** `list/1`: lista de descrição, termo à esquerda em um quarto da largura. */
export function DescriptionList({ items }: { items: { title: string; content: ReactNode }[] }) {
  return (
    <div className="mt-14">
      <dl className="-my-4 divide-y divide-[var(--color-neutral-100)]">
        {items.map((item) => (
          <div key={item.title} className="flex gap-4 py-4 text-sm leading-6 sm:gap-8">
            <dt className="w-1/4 flex-none text-[var(--color-neutral-500)]">{item.title}</dt>
            <dd className="m-0 text-[var(--color-neutral-700)]">{item.content}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** `back/1`: link de voltar, com seta. */
export function Back({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div className="mt-16">
      <a
        href={href}
        className="text-sm font-semibold leading-6 text-[var(--color-neutral-900)] no-underline hover:text-[var(--color-neutral-700)]"
      >
        <Icon name="fa-arrow-left" className="h-3 w-3" /> {children}
      </a>
    </div>
  );
}

/**
 * `meta_info/1`: o rodapé de paginação.
 *
 * A conta do início é `current_offset + 1`, **exceto** quando o total é zero —
 * aí é zero. Sem essa exceção a lista vazia diria "Mostrando 1 até 0 de 0".
 */
export function MetaInfo({
  currentOffset,
  pageSize,
  totalCount,
}: {
  currentOffset: number;
  pageSize: number;
  totalCount: number;
}) {
  const inicio = totalCount === 0 ? 0 : currentOffset + 1;
  const fim = Math.min(currentOffset + pageSize, totalCount);

  return (
    <p className="m-0 text-[var(--color-brand-purple-dark)]/80">
      Mostrando {inicio} até {fim} de {totalCount} registros
    </p>
  );
}

/** `inside_card/1`: cartão aninhado com ícone, título, subtítulo e valor. */
export function InsideCard({
  icon,
  title,
  subtitle,
  value,
  className,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  value?: string;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex w-full items-center justify-between rounded-xl border border-[var(--color-brand-purple-dark)]/10 bg-[var(--color-brand-purple-dark)]/5 p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center gap-x-2">
        <div className="flex h-[1.875rem] w-[1.875rem] items-center justify-center text-2xl text-[var(--color-brand-purple-dark)]/60">
          <Icon name={icon} />
        </div>
        <div>
          <p className="m-0 text-base/4 font-bold text-[var(--color-brand-purple-dark)]/90">
            {title}
          </p>
          {subtitle && (
            <p className="m-0 text-xs text-[var(--color-brand-purple-dark)]/60">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="text-2xl font-bold text-[var(--color-brand-purple-dark)]">{value}</div>
    </div>
  );
}

/** `empty_state_card/1`: ícone grande em círculo, frase forte, apoio opcional. */
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
    <div
      className={["flex flex-col items-center p-6 text-center", className].filter(Boolean).join(" ")}
    >
      <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-[var(--color-neutral-50)] text-[var(--color-neutral-400)]">
        <Icon name={icon} className="text-6xl" />
      </div>
      <p className="m-0 max-w-4xl text-2xl font-extrabold text-[var(--color-brand-purple-dark)]">
        {text}
      </p>
      {children && (
        <div className="mt-2 text-[var(--color-brand-purple-dark)]/80">{children}</div>
      )}
    </div>
  );
}

/** `loading_card/1`: mensagem e roda girando. */
export function LoadingCard({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-4 rounded-2xl border border-[var(--color-brand-purple-dark)]/10 p-4">
      <p className="m-0 text-[var(--color-brand-purple-dark)]/60">{message}</p>
      <Icon name="fa-spinner-third" className="animate-spin text-4xl text-[var(--color-brand-blue)]" />
    </div>
  );
}

/** `avatar/1`: dois formatos, seis tamanhos, fundo azul quando não há foto. */
export function Avatar({
  imageUrl,
  title,
  shape = "round",
  size = "medium",
  className,
}: {
  imageUrl?: string;
  title?: string;
  shape?: "round" | "square";
  size?: "extra_small" | "small" | "medium" | "extra_medium" | "large" | "extra_large";
  className?: string;
}) {
  const TAMANHO = {
    extra_small: "h-4 w-4",
    small: "h-5 w-5",
    medium: "h-10 w-10",
    extra_medium: "h-12 w-12",
    large: "h-20 w-20",
    extra_large: "h-24 w-24",
  } as const;

  return (
    <div
      title={title}
      className={[
        "flex-shrink-0 overflow-hidden bg-[var(--color-blue)]",
        shape === "round" ? "rounded-full" : "rounded-lg",
        TAMANHO[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {imageUrl && <img src={imageUrl} alt="" className="h-full w-full object-cover" />}
    </div>
  );
}

/**
 * `progress/1`: barra com percentual ao lado.
 *
 * O trilho tem cor para `default`, `accent` e `error`, e **não tem para
 * `purple`** — nessa variante ele cai no `bg-blue/20` da classe base, com a
 * barra roxa por cima. Copiado assim; ver achado 105.
 */
export function Progress({
  value,
  variant = "default",
  showPercentage = true,
  className,
}: {
  value: number;
  variant?: "default" | "error" | "purple" | "accent";
  showPercentage?: boolean;
  className?: string;
}) {
  const trilho = {
    default: "bg-[var(--color-blue)]/20",
    accent: "bg-[var(--color-brand-accent)]/20",
    error: "bg-[var(--color-red)]/20",
    // Sem ramo próprio no original: fica com o trilho azul da classe base.
    purple: "bg-[var(--color-blue)]/20",
  }[variant];

  const barra = {
    default: "bg-[var(--color-blue)]",
    purple: "bg-[var(--color-purple)]",
    accent: "bg-[var(--color-brand-accent)]",
    error: "bg-[var(--color-red)]",
  }[variant];

  return (
    <div className={["flex items-baseline gap-3", className].filter(Boolean).join(" ")}>
      <div className={`h-2 w-full rounded-full ${trilho}`}>
        <div
          className={`h-2 rounded-full transition-all duration-1000 ease-linear ${barra}`}
          style={{ width: `${value}%` }}
        />
      </div>
      {showPercentage && <p className="m-0 text-[var(--color-blue-dark)]">{value}%</p>}
    </div>
  );
}
