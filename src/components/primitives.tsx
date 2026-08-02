import type { ButtonHTMLAttributes, ReactNode } from "react";
import type {
  AppointmentStatus,
  AuthorizationStatus,
  ScheduleStatus,
} from "../contracts/index.js";

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
   * inativo, o motivo aparece abaixo dele e é associado por `aria-describedby`.
   *
   * Esconder a ação seria mais limpo e seria pior: ação que desaparece sem
   * explicação torna a regra de negócio invisível, e quem opera conclui que o
   * sistema está quebrado. Ver `docs/decisions/0002`.
   *
   * O botão usa `aria-disabled`, e não o atributo `disabled`, **de propósito**.
   * Um botão `disabled` sai da ordem de foco: quem navega por teclado nunca o
   * encontra, nunca é levado até ele e por isso nunca ouve o `aria-describedby`
   * que carrega o motivo. Toda a convenção de "manter visível e explicar" vale
   * só para quem enxerga a tela — que é o oposto do que ela se propõe.
   *
   * Com `aria-disabled` o botão continua alcançável pelo Tab, é anunciado como
   * indisponível, e o motivo é lido no foco. O clique é barrado no manipulador.
   * Ver `docs/decisions/0003`.
   */
  unavailableReason?: string;
};

export function Button({
  variant = "secondary",
  unavailableReason,
  children,
  className = "",
  onClick,
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

  /**
   * O estado indisponível tem cor própria, e não opacidade.
   *
   * `opacity-55` sobre o botão primário dá 2,35:1 e sobre o secundário 3,48:1.
   * Hoje isso é **conforme**: a WCAG 1.4.3 isenta componentes inativos, e um
   * botão `disabled` é inativo. Ao devolvê-lo à ordem de foco a isenção deixa
   * de valer — e deixaria de valer o argumento, não só a regra: um controle que
   * a pessoa alcança e não consegue ler não ajuda ninguém.
   *
   * Este par é `rgba(43,35,91,0.72)` sobre `#f4f6f7`, 5,56:1, e está declarado
   * em `src/tokens/contrast.ts` para que o teste de tokens o proteja.
   */
  const unavailable =
    "cursor-not-allowed border border-[var(--border-strong)] bg-[#f4f6f7] text-[rgba(43,35,91,0.72)]";

  const reasonId = unavailableReason ? `${props.id ?? "acao"}-motivo` : undefined;
  const blocked = Boolean(unavailableReason);

  return (
    <span className="inline-flex max-w-full flex-col items-start gap-1">
      <button
        type="button"
        className={`${base} ${blocked ? unavailable : variants[variant]} ${className}`}
        // `disabled` só quando quem chamou pediu explicitamente. O bloqueio por
        // regra de negócio usa `aria-disabled` para não sair do Tab.
        disabled={props.disabled}
        aria-disabled={blocked || undefined}
        aria-describedby={reasonId}
        // A barreira que importa é esta: bloqueado, o `onClick` de quem chamou
        // não chega a ser ligado. O `stopPropagation` alcança só os handlers
        // React de elementos ancestrais — não ouvintes nativos, que o React
        // registra na raiz e por isso disparam antes deste. E `preventDefault`
        // não serviria: um `type="button"` não tem ação padrão a prevenir.
        onClick={blocked ? (event) => event.stopPropagation() : onClick}
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

/**
 * Situação da autorização TISS, com os rótulos do produto.
 *
 * Quatro das dez são frequentemente lidas como recusa e não são. O tom separa
 * três grupos: o que espera a clínica agir (pendência), o que espera o convênio
 * (aviso), e o que já foi decidido. `partially_authorized` fica em tom de aviso
 * de propósito — pintá-la de verde faz a clínica agendar o que não foi
 * autorizado.
 */
const AUTHORIZATION_STATUS: Record<AuthorizationStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pendente", tone: "info" },
  analysing: { label: "Em análise", tone: "info" },
  authorized: { label: "Autorizada", tone: "ok" },
  partially_authorized: { label: "Autorizada parcialmente", tone: "warn" },
  denied: { label: "Negada", tone: "danger" },
  waiting_requester_justification: { label: "Aguardando justificativa", tone: "pending" },
  waiting_provider_documentation: { label: "Aguardando documentação", tone: "pending" },
  sync_error: { label: "Erro na sincronização", tone: "danger" },
  invoiced: { label: "Faturada", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

export function AuthorizationStatusChip({ status }: { status: AuthorizationStatus }) {
  const { label, tone } = AUTHORIZATION_STATUS[status];
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
