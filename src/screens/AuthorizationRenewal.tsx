import type { ScreenProps } from "@brucesantos/design-space";
import type { AuthorizationRenewalData, AuthorizationWindow } from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
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
  canEnableAutoRenew,
  renewsIntoEmpty,
  whatRenewalChanges,
} from "../rules/authorizations.js";

/**
 * Renovação automática da janela de autorização.
 *
 * `PatientAuthorization` é o **período**, e não a guia: tem
 * `has_many :authorizations` e nenhuma quantidade. O worker move
 * `duration_end_at` três meses à frente — e só isso.
 *
 * Duas decisões:
 *
 * 1. **A tela diz o que a renovação não faz.** "Autorização renovada" é lido
 *    como "o paciente tem sessões de novo". Não tem: o saldo continua sendo o
 *    das guias que já estavam lá, e quem repõe saldo é uma guia nova.
 *
 * 2. **A janela que vai renovar vazia é apontada antes de renovar.** Prolongar
 *    um recipiente vazio não produz erro nenhum — alguém só descobre ao tentar
 *    marcar, com a família no telefone.
 */
export function AuthorizationRenewal({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as janelas" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const renewal = data as AuthorizationRenewalData | null;
  if (!renewal) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (renewal.windows.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma janela de autorização"
        description="A janela é o período em que as guias do paciente valem. Renovar move a data de fim; o saldo vive nas guias."
      />,
    );
  }

  const vazias = renewsIntoEmpty(renewal);

  return wrap(
    context,
    <div className="space-y-4">
      {vazias.length > 0 && (
        <Notice
          tone="warn"
          title={`${vazias.length} ${vazias.length === 1 ? "janela vai renovar" : "janelas vão renovar"} sem sessão nenhuma`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {vazias.map((window) => (
              <li key={window.id}>
                {window.patientName} — saldo zero, e a janela vai até{" "}
                {formatDate(`${window.durationEnd}T12:00:00.000-03:00`, locale)}.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            Renovar move a data de fim e nada mais: não cria guia nova nem devolve sessão.
            Prolongar um recipiente vazio não produz erro — alguém descobre ao tentar marcar, com a
            família no telefone.
          </p>
        </Notice>
      )}

      <Card as="section">
        <CardHeader title="Janelas de autorização" hint={`${renewal.windows.length} no total`} />
        <div className="space-y-3 px-5 py-5">
          {renewal.windows.map((window) => (
            <Row key={window.id} window={window} data={renewal} locale={locale} />
          ))}
        </div>
      </Card>
    </div>,
  );
}

function Row({
  window,
  data,
  locale,
}: {
  window: AuthorizationWindow;
  data: AuthorizationRenewalData;
  locale: string | undefined;
}) {
  const ligar = canEnableAutoRenew(data, window.patientName);

  return (
    <article className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{window.patientName}</span>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">
          {formatDate(`${window.durationStart}T12:00:00.000-03:00`, locale)} a{" "}
          {formatDate(`${window.durationEnd}T12:00:00.000-03:00`, locale)}
        </span>
        <Chip tone={window.remainingSessions === 0 ? "warn" : "ok"}>
          {window.remainingSessions === 0
            ? "sem saldo"
            : `${window.remainingSessions} ${window.remainingSessions === 1 ? "sessão" : "sessões"}`}
        </Chip>
        <Chip tone={window.autoRenew ? "info" : "neutral"}>
          {window.autoRenew ? "renova sozinha" : "não renova sozinha"}
        </Chip>
      </div>

      {/* O que a renovação muda, e o que ela não muda — dito na linha, porque é
          aqui que alguém lê "renovada" e conclui a coisa errada. */}
      {window.autoRenew && (
        <p className="m-0 mt-1.5 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
          {whatRenewalChanges(window)}
        </p>
      )}

      {/* O índice único só se manifesta na hora de salvar a segunda janela.
          Aqui ele aparece antes, com o motivo. */}
      {!window.autoRenew && (
        <div className="mt-2">
          <Button
            id={`ligar-renovacao-${window.id}`}
            unavailableReason={ligar.allowed ? undefined : ligar.reason}
          >
            Ligar a renovação automática
          </Button>
        </div>
      )}
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Renovação da janela"
      subtitle="Renovar move a data. Saldo é outra coisa."
      breadcrumb={[{ label: "Autorizações", path: "/authorizations" }, { label: "Renovação" }]}
    >
      {children}
    </AppShell>
  );
}
