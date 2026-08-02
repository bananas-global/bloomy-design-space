import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { AppointmentStatus, ClaimStatus, ScheduleStatus } from "../contracts/index.js";

/**
 * Componentes locais do Bloomy.
 *
 * Exclusivos deste repositório. Se um deles parecer genérico o bastante para
 * virar pacote, a resposta padrão é não: reuso de UI é decisão local, e promover
 * componente para o motor porque duas telas pareceram semelhantes é exatamente
 * como o motor vira contaminado por UI de cliente.
 */

/* ============================================================== botão */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  /**
   * Motivo pelo qual a ação está indisponível. Quando presente, o botão fica
   * desabilitado, o motivo aparece abaixo dele e é associado por
   * `aria-describedby`.
   *
   * Esconder a ação seria mais limpo e seria pior: ação que desaparece sem
   * explicação torna a regra de negócio invisível, e quem opera conclui que o
   * sistema está quebrado. Ver `docs/decisions/0002`.
   */
  unavailableReason?: string;
};

export function Button({
  variant = "secondary",
  unavailableReason,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-field px-4 py-2 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55";

  const variants = {
    primary: "bg-action text-white hover:bg-action-hover",
    secondary: "border border-[var(--border-strong)] bg-surface text-navy hover:bg-ink-50",
    danger: "border border-danger-fg/35 bg-danger-bg text-danger-fg hover:bg-danger-bg/70",
    ghost: "text-action hover:bg-ink-50",
  } as const;

  const reasonId = unavailableReason ? `${props.id ?? "acao"}-motivo` : undefined;

  return (
    <span className="inline-flex max-w-full flex-col items-start gap-1">
      <button
        type="button"
        className={`${base} ${variants[variant]} ${className}`}
        disabled={props.disabled || Boolean(unavailableReason)}
        aria-describedby={reasonId}
        {...props}
      >
        {children}
      </button>
      {unavailableReason && (
        <span id={reasonId} className="max-w-[46ch] text-[13px] text-[var(--fg-2)]">
          {unavailableReason}
        </span>
      )}
    </span>
  );
}

/* =============================================================== chip */

type Tone = "ok" | "danger" | "warn" | "pending" | "info" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok-fg",
  danger: "bg-danger-bg text-danger-fg",
  warn: "bg-warn-bg text-warn-fg",
  pending: "bg-pending-bg text-pending-fg",
  info: "bg-info-bg text-info-fg",
  neutral: "bg-neutral-bg text-neutral-fg",
};

export function Chip({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  // O rótulo textual está sempre presente. Status comunicado só por cor falha
  // 1.4.1 e falha qualquer pessoa lendo uma captura de tela em preto e branco.
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  scheduled: { label: "Agendado", tone: "info" },
  confirmed: { label: "Confirmado", tone: "ok" },
  in_session: { label: "Em atendimento", tone: "neutral" },
  finished: { label: "Finalizado", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "danger" },
  no_show: { label: "Ausente", tone: "pending" },
};

export function AppointmentStatusChip({ status }: { status: AppointmentStatus }) {
  const { label, tone } = APPOINTMENT_STATUS[status];
  return <Chip tone={tone}>{label}</Chip>;
}

/**
 * Situação do agendamento, com os rótulos que o Bloomy mostra hoje.
 *
 * Vêm de `priv/gettext/pt_BR/LC_MESSAGES/enums.po`, inclusive quando são
 * estranhos fora de contexto: "Assinar" é o que aparece no quadro da agenda, e
 * trocar por "Assinatura pendente" aqui faria a especificação e o produto
 * divergirem numa palavra que a clínica usa em voz alta.
 *
 * Cinco destes doze estados são trabalho pendente de alguém — pronto, não
 * iniciado, atrasado, pendente de registro e as duas assinaturas. Todos usam
 * tom de pendência de propósito: são a fila invisível que a coordenação precisa
 * enxergar para fechar o mês.
 */
const SCHEDULE_STATUS: Record<ScheduleStatus, { label: string; tone: Tone }> = {
  scheduled: { label: "Agendado", tone: "info" },
  incomplete: { label: "Incompleto", tone: "warn" },
  ready_for_service: { label: "Pronto", tone: "ok" },
  not_started: { label: "Não iniciado", tone: "pending" },
  delayed: { label: "Atrasado", tone: "warn" },
  ongoing: { label: "Em sessão", tone: "neutral" },
  pending_register: { label: "Pendente", tone: "pending" },
  pending_signature: { label: "Assinar", tone: "pending" },
  pending_supervisor_signature: { label: "Assinatura Supervisor", tone: "pending" },
  finished: { label: "Finalizado", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "danger" },
  missed: { label: "Faltou", tone: "danger" },
};

export function ScheduleStatusChip({ status }: { status: ScheduleStatus }) {
  const { label, tone } = SCHEDULE_STATUS[status];
  return <Chip tone={tone}>{label}</Chip>;
}

export function scheduleStatusLabel(status: ScheduleStatus): string {
  return SCHEDULE_STATUS[status].label;
}

const CLAIM_STATUS: Record<ClaimStatus, { label: string; tone: Tone }> = {
  under_review: { label: "Em análise", tone: "warn" },
  denied: { label: "Recusada", tone: "danger" },
  pending_documents: { label: "Documentos pendentes", tone: "pending" },
  approved: { label: "Autorizada", tone: "ok" },
  resubmitted: { label: "Reenviada", tone: "info" },
};

export function ClaimStatusChip({ status }: { status: ClaimStatus }) {
  const { label, tone } = CLAIM_STATUS[status];
  return <Chip tone={tone}>{label}</Chip>;
}

/* =============================================================== card */

export function Card({
  children,
  className = "",
  as: Element = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <Element
      className={`rounded-card border border-[var(--border-soft)] bg-surface shadow-card ${className}`}
    >
      {children}
    </Element>
  );
}

export function CardHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border-b border-[var(--border-soft)] px-5 py-4">
      <h2 className="m-0 text-[15px] font-bold text-navy">{title}</h2>
      {hint && <p className="m-0 mt-0.5 text-[13px] text-[var(--fg-2)]">{hint}</p>}
    </div>
  );
}

/* ====================================================== lista de pares */

export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="m-0 grid grid-cols-[minmax(120px,auto)_1fr] gap-x-6 gap-y-2.5 text-[15px]">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-[var(--fg-2)]">{item.label}</dt>
          <dd className="m-0 text-navy">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ====================================================== avisos e vazio */

/**
 * Aviso destacado.
 *
 * `role="alert"` só quando o aviso aparece em resposta a uma ação — usar em
 * conteúdo estático faz o leitor de tela interromper a leitura para anunciar algo
 * que já estava na página.
 */
export function Notice({
  tone = "warn",
  title,
  children,
  live = false,
  level = 2,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  live?: boolean;
  /** Nível do heading, para manter a hierarquia da página coerente. */
  level?: 2 | 3;
}) {
  const Heading = `h${level}` as "h2" | "h3";
  const border = {
    ok: "border-ok-fg/25 bg-ok-bg",
    danger: "border-danger-fg/25 bg-danger-bg",
    warn: "border-warn-fg/25 bg-warn-bg",
    pending: "border-pending-fg/25 bg-pending-bg",
    info: "border-info-fg/25 bg-info-bg",
    neutral: "border-neutral-fg/25 bg-neutral-bg",
  }[tone];

  return (
    <div
      className={`rounded-card border px-4 py-3.5 ${border}`}
      {...(live ? { role: "alert" as const } : {})}
    >
      {/* Heading de verdade, não um parágrafo em negrito: o aviso é uma região da
          página, e quem navega por headings precisa alcançá-lo. */}
      <Heading className="m-0 text-[15px] font-bold text-navy">{title}</Heading>
      {children && <div className="mt-1.5 text-[14px] text-navy/85">{children}</div>}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="px-6 py-12 text-center">
      <h2 className="m-0 text-[17px] font-bold text-navy">{title}</h2>
      <p className="mx-auto mt-2 max-w-[48ch] text-[15px] text-[var(--fg-2)]">{description}</p>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-danger-fg/25 bg-danger-bg px-6 py-8">
      <div role="alert">
        <h2 className="m-0 text-[17px] font-bold text-danger-fg">Não foi possível carregar</h2>
        <p className="mt-2 text-[15px] text-navy">{message}</p>
        <p className="mt-1 text-[13px] text-[var(--fg-2)]">
          Nada foi perdido. Recarregue a página ou tente de novo em instantes.
        </p>
      </div>
    </Card>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <Card className="px-5 py-5">
      <p className="m-0 text-[15px] text-[var(--fg-2)]" role="status">
        {label}…
      </p>
      <div className="mt-4 space-y-2.5" aria-hidden="true">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-14 animate-pulse rounded-field bg-ink-50" />
        ))}
      </div>
    </Card>
  );
}

/* ============================================================ timeline */

export function Timeline({
  events,
}: {
  events: { at: string; label: string; by: "insurer" | "clinic" }[];
}) {
  return (
    <ol className="m-0 list-none space-y-3 p-0">
      {events.map((event, index) => (
        <li key={`${event.at}-${index}`} className="flex gap-3">
          <span
            aria-hidden="true"
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
              event.by === "insurer" ? "bg-pending-fg" : "bg-action"
            }`}
          />
          <div className="min-w-0">
            <p className="m-0 text-[14px] font-semibold text-navy">{event.label}</p>
            <p className="m-0 text-[13px] text-[var(--fg-2)]">
              {event.at.slice(8, 10)}/{event.at.slice(5, 7)} às {event.at.slice(11, 16)} ·{" "}
              {event.by === "insurer" ? "convênio" : "clínica"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
