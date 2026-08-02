import type { ScreenProps } from "@brucesantos/design-space";
import type { DistributedSchedule, DistributionData } from "../contracts/index.js";
import { formatDate, formatMoney, formatTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  cutoffTime,
  demandExceededBalance,
  startingBalance,
  unbillableCents,
  withoutAuthorization,
} from "../rules/distribution.js";

/**
 * Distribuição de guias do dia.
 *
 * O distribuidor decide **qual guia paga qual atendimento**. Ele percorre os
 * atendimentos em ordem de horário e vai consumindo os pacotes até acabar.
 *
 * Duas consequências, e as duas são invisíveis no produto:
 *
 * 1. **O relógio decide quem é cobrável.** Quando o saldo é menor que a demanda
 *    do dia, quem é atendido de manhã fica com guia e quem é atendido à tarde
 *    fica sem. Pode ser a regra certa — é previsível e não exige julgamento —,
 *    mas ninguém a escolheu, e ela decide o que a clínica consegue cobrar.
 *
 * 2. **A lista de quem ficou sem já existe.** O distribuidor acumula
 *    `skipped_schedule_ids` e devolve no resultado; o worker chama e ignora o
 *    retorno. A informação é formada no instante da decisão e jogada fora —
 *    a perda só aparece no fechamento do mês, quando já não dá para pedir
 *    autorização.
 */
export function Distribution({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a distribuição" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const distribution = data as DistributionData | null;
  if (!distribution) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (distribution.schedules.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum atendimento para distribuir"
        description="A distribuição roda uma vez por dia e liga cada atendimento a uma guia. Sem atendimento, não há o que ligar."
      />,
    );
  }

  const semGuia = withoutAuthorization(distribution);
  const naoCobravel = unbillableCents(distribution);
  const corte = cutoffTime(distribution);
  const faltouSaldo = demandExceededBalance(distribution);

  return wrap(
    context,
    <div className="space-y-4">
      {semGuia.length > 0 && (
        <Notice
          tone="danger"
          title={`${semGuia.length} ${semGuia.length === 1 ? "atendimento ficou" : "atendimentos ficaram"} sem guia — ${formatMoney(naoCobravel, locale)}`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {semGuia.map((schedule) => (
              <li key={schedule.id}>
                {formatTime(schedule.start, locale)} · {schedule.patientName} —{" "}
                {schedule.serviceName}
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            Esta lista já existe no sistema: o distribuidor a monta enquanto decide, e quem o chama
            ignora o retorno. A informação é formada no instante da decisão e jogada fora — a perda
            só aparece no fechamento do mês, quando já não dá para pedir autorização.
          </p>
        </Notice>
      )}

      {corte && faltouSaldo && (
        <Notice tone="warn" title="Foi o relógio que decidiu">
          <p className="m-0">
            O dia pediu {distribution.schedules.length} sessões e havia{" "}
            {startingBalance(distribution)} de saldo. A distribuição percorre os atendimentos em
            ordem de horário, então o corte caiu às {formatTime(corte, locale)}: quem foi atendido
            antes ficou com guia, quem foi atendido depois ficou sem.
          </p>
          <p className="m-0 mt-2">
            Não é critério clínico nem de urgência. Pode até ser a regra certa — é previsível e
            não exige julgamento —, mas vale ser escolhida de propósito, e não herdada da ordenação
            que a rotina já usava para percorrer o dia.
          </p>
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title={`Atendimentos de ${formatDate(`${distribution.date}T12:00:00.000-03:00`, locale)}`}
          hint={`${distribution.schedules.length} no dia · saldo inicial ${startingBalance(distribution)}`}
        />
        <div className="space-y-2 px-5 py-5">
          {[...distribution.schedules]
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((schedule) => (
              <Row key={schedule.id} schedule={schedule} locale={locale} />
            ))}
        </div>
      </Card>
    </div>,
  );
}

function Row({
  schedule,
  locale,
}: {
  schedule: DistributedSchedule;
  locale: string | undefined;
}) {
  const temGuia = schedule.authorizationCode !== undefined;

  return (
    <article className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-field border border-[var(--border-soft)] px-4 py-2.5">
      <span className="text-[0.875rem] font-semibold text-navy">
        {formatTime(schedule.start, locale)}
      </span>
      <span className="text-[0.9375rem] text-navy">{schedule.patientName}</span>
      <span className="text-[0.8125rem] text-[var(--fg-2)]">{schedule.serviceName}</span>
      {/* Com guia ou sem: a etiqueta diz qual, em texto. */}
      <Chip tone={temGuia ? "ok" : "danger"}>
        {temGuia ? `guia ${schedule.authorizationCode}` : "sem guia"}
      </Chip>
      <span className="text-[0.8125rem] text-[var(--fg-2)]">
        {formatMoney(schedule.amountCents, locale)}
      </span>
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Distribuição de guias"
      subtitle="Quem foi atendido antes fica com a guia"
      breadcrumb={[{ label: "Autorizações", path: "/authorizations" }, { label: "Distribuição" }]}
    >
      {children}
    </AppShell>
  );
}
