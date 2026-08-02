import type { ScreenProps } from "@brucesantos/design-space";
import type { NotificationItem, NotificationsData } from "../contracts/index.js";
import { formatDateTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  canMarkAllRead,
  canOpen,
  identifiesSubject,
  inOrder,
  isUnread,
  linkTarget,
  namesPatient,
  unidentified,
  unreadCount,
} from "../rules/notifications.js";

/**
 * Notificações.
 *
 * O recurso que mais parece resolvido e menos foi olhado. O schema tem três
 * campos e o estado de leitura mora no vínculo com a pessoa — mas o que decide
 * a tela é ler **quem envia**: quatro chamadas no sistema inteiro, três delas
 * gravando string vazia como destino.
 *
 * Três decisões seguem daí:
 *
 * 1. **Sem destino e com destino vazio são estados diferentes.** Um é uma
 *    notificação que nunca pretendeu levar a lugar nenhum; o outro é uma que
 *    pretendia e não leva. Só o segundo é defeito, e apagá-los no mesmo cinza
 *    esconderia isso.
 *
 * 2. **A hora de criação fica junto do texto, sempre.** O conteúdo é uma cópia
 *    congelada no envio. Sem a data ao lado, ele se lê como estado atual.
 *
 * 3. **O conteúdo clínico é apontado, não removido.** O texto que chega traz
 *    nome de paciente e especialidade sem passar por política nenhuma. É assim
 *    hoje; declarar é o que permite decidir o limite antes de existirem quarenta
 *    remetentes.
 */
export function Notifications({ context }: ScreenProps) {
  const { data, isLoading, error, locale, permissions } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as notificações" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const notifications = data as NotificationsData | null;
  if (!notifications) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (notifications.items.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma notificação"
        description="Aqui chegam os avisos do sistema: agendamento assumido, agendamento atrasado e menção no chat multidisciplinar. São só esses quatro — o resto do produto ainda não avisa nada."
      />,
    );
  }

  const items = inOrder(notifications);
  const unread = unreadCount(notifications);
  const markAll = canMarkAllRead(notifications);
  const semAssunto = unidentified(notifications);

  return wrap(
    context,
    <div className="mx-auto max-w-[48rem] space-y-4">
      <Card as="section">
        <CardHeader
          title={
            unread === 0
              ? "Tudo lido"
              : `${unread} ${unread === 1 ? "não lida" : "não lidas"}`
          }
          hint={`${notifications.items.length} no total`}
        />
        <div className="space-y-3 px-5 py-5">
          {/* Lido é do vínculo, não da notificação: marcar todas age sobre as
              suas, e a frase diz isso para não parecer ação global. */}
          <p className="m-0 max-w-[64ch] text-[14px] text-navy">
            Lida é uma marca sua, não da notificação. A mesma mensagem continua não lida para as
            outras pessoas que a receberam.
          </p>
          <Button
            id="marcar-todas"
            variant="primary"
            unavailableReason={markAll.allowed ? undefined : markAll.reason}
          >
            Marcar todas como lidas
          </Button>
        </div>
      </Card>

      {semAssunto.length > 0 && (
        <Notice
          tone="warn"
          title={`${semAssunto.length === 1 ? "Uma notificação não diz" : `${semAssunto.length} notificações não dizem`} sobre o que ${semAssunto.length === 1 ? "é" : "são"}`}
        >
          Comunicam que algo aconteceu, não identificam o agendamento nem o paciente, e não levam a
          nenhuma tela. Quem recebe não consegue nem conferir se concorda.
        </Notice>
      )}

      <ul className="m-0 list-none space-y-3 p-0">
        {items.map((item) => (
          <li key={item.id}>
            <NotificationCard item={item} locale={locale} permissions={permissions} />
          </li>
        ))}
      </ul>
    </div>,
  );
}

function NotificationCard({
  item,
  locale,
  permissions,
}: {
  item: NotificationItem;
  locale: string | undefined;
  permissions: string[];
}) {
  const unread = isUnread(item);
  const open = canOpen(item, permissions);
  const target = linkTarget(item);
  const patient = namesPatient(item);

  return (
    <article
      className={`rounded-card border px-5 py-4 ${
        unread ? "border-pending-fg/35 bg-pending-bg" : "border-[var(--border-soft)]"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="m-0 text-[15px] font-bold text-navy">{item.title}</h2>
        {/* Rótulo textual, e não só a cor de fundo: não lida é informação. */}
        <Chip tone={unread ? "pending" : "neutral"}>{unread ? "Não lida" : "Lida"}</Chip>
      </div>

      {/* A data fica junto do texto porque o texto é cópia congelada no envio.
          Sem ela ao lado, ele se lê como estado atual. */}
      <p className="m-0 mt-0.5 text-[13px] text-[var(--fg-2)]">
        Recebida em {formatDateTime(item.at, locale)}
        {item.readAt && <> · lida por você em {formatDateTime(item.readAt, locale)}</>}
      </p>

      <p className="m-0 mt-2 max-w-[64ch] whitespace-pre-line text-[15px] leading-relaxed text-navy">
        {item.content}
      </p>

      {patient && (
        <p className="m-0 mt-2 max-w-[64ch] text-[13px] text-[var(--fg-2)]">
          Este texto nomeia {patient} e a especialidade do atendimento. A leitura de uma notificação
          não passa por política nenhuma — o que a tela do paciente checaria, o sino entrega direto.
        </p>
      )}

      {!identifiesSubject(item) && (
        <Notice tone="warn" title="Esta notificação não diz sobre o que é" level={3}>
          Não identifica o agendamento, não nomeia o paciente e não leva a nenhuma tela. É a única
          das quatro que comunica a perda de algo, e a menos identificada.
        </Notice>
      )}

      <div className="mt-3">
        <Button
          id={`abrir-${item.id}`}
          unavailableReason={open.allowed ? undefined : open.reason}
        >
          Abrir
        </Button>
        {target.kind === "empty" && (
          <p className="m-0 mt-2 max-w-[64ch] text-[13px] text-[var(--fg-2)]">
            O destino foi gravado como texto vazio, e não como ausência. Renderizado sem cuidado,
            vira um link clicável que não vai a lugar nenhum — que é pior do que não ter link.
          </p>
        )}
      </div>
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Notificações"
      breadcrumb={[{ label: "Notificações" }]}
    >
      {children}
    </AppShell>
  );
}
