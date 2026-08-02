import type { ScreenProps } from "@brucesantos/design-space";
import type { AutoCheckoutData, OpenPresence } from "../contracts/index.js";
import { formatDateTime } from "../contracts/index.js";
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
  closedByTheSystem,
  closedCleanly,
  statedDurationLabel,
  willBecomeAbsurd,
} from "../rules/autoCheckout.js";

/**
 * Saída automática.
 *
 * A rotina fecha os check-ins que ficaram abertos, carimbando a hora em que
 * rodou. **Não há filtro de data — nenhum.** Um check-in de três meses atrás
 * ganha uma saída de hoje, e o registro passa a dizer que a criança ficou
 * noventa dias na unidade.
 *
 * A intenção é boa: limpar a lista de quem está na clínica, que é uma tela
 * operacional e não pode acumular. O efeito colateral é que a **duração** vira
 * absurdo para tudo que não é de hoje.
 *
 * Três decisões:
 *
 * 1. **Os dois grupos aparecem separados.** Sozinha, cada linha parece
 *    plausível; é a comparação entre "4 horas" e "89 dias" que denuncia.
 *
 * 2. **A duração é dita em dias quando passa de um.** "2136 horas" obriga quem
 *    lê a dividir de cabeça para entender o tamanho do problema.
 *
 * 3. **A assinatura do sistema é preservada e elogiada.** `checkout_done_by:
 *    "system"` é a única parte honesta da operação, e sem ela a duração absurda
 *    pareceria erro de quem estava no balcão.
 */
export function AutoCheckout({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as presenças abertas" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const checkout = data as AutoCheckoutData | null;
  if (!checkout) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const absurdos = willBecomeAbsurd(checkout);
  const limpos = closedCleanly(checkout);
  const jaFechados = checkout.records.filter((record) => record.checkoutAt !== undefined);

  if (checkout.records.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma presença registrada"
        description="Quando alguém faz check-in na unidade, a presença aparece aqui até a saída ser registrada."
      />,
    );
  }

  return wrap(
    context,
    <div className="space-y-4">
      {absurdos.length > 0 && (
        <Notice
          tone="danger"
          title={`${absurdos.length} ${absurdos.length === 1 ? "registro vai declarar" : "registros vão declarar"} uma presença que não aconteceu`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {absurdos.map((record) => (
              <li key={record.id}>
                {record.patientName} — entrou em {formatDateTime(record.checkinAt, locale)}. Com a
                saída de agora, o registro vai dizer{" "}
                <span className="font-semibold">
                  {statedDurationLabel(record, checkout.runsAt)} na unidade
                </span>
                .
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            A rotina não filtra por data: ela fecha todo check-in sem saída, de qualquer dia da
            história, com a hora em que rodou. Limpar a lista é a intenção certa; carimbar a
            duração é o efeito colateral.
          </p>
        </Notice>
      )}

      {limpos.length > 0 && (
        <Card as="section">
          <CardHeader
            title="Presenças de hoje"
            hint={`${limpos.length} ${limpos.length === 1 ? "aberta" : "abertas"}`}
          />
          <div className="px-5 py-5">
            <ul className="m-0 list-none space-y-2 p-0">
              {limpos.map((record) => (
                <li key={record.id}>
                  <Row record={record} runsAt={checkout.runsAt} locale={locale} />
                </li>
              ))}
            </ul>
            <p className="m-0 mt-3 text-[0.8125rem] text-[var(--fg-2)]">
              Nestas a rotina faz o que promete: fecha a lista sem inventar duração nenhuma.
            </p>
          </div>
        </Card>
      )}

      {jaFechados.length > 0 && (
        <Card as="section">
          <CardHeader title="Já fechadas" hint="e por quem" />
          <div className="px-5 py-5">
            <ul className="m-0 list-none space-y-2 p-0">
              {jaFechados.map((record) => (
                <li key={record.id}>
                  <Row record={record} runsAt={checkout.runsAt} locale={locale} />
                </li>
              ))}
            </ul>
            {/* A marca do sistema é a única parte honesta da rotina. */}
            <p className="m-0 mt-3 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
              A rotina assina o que fecha. Sem essa marca, um registro fechado por ela seria
              indistinguível de um fechado por alguém — e a duração absurda pareceria erro de quem
              estava no balcão.
            </p>
          </div>
        </Card>
      )}
    </div>,
  );
}

function Row({
  record,
  runsAt,
  locale,
}: {
  record: OpenPresence;
  runsAt: string;
  locale: string | undefined;
}) {
  const peloSistema = closedByTheSystem(record);

  return (
    <article className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-field border border-[var(--border-soft)] px-4 py-2.5">
      <span className="text-[0.9375rem] font-semibold text-navy">{record.patientName}</span>
      <span className="text-[0.8125rem] text-[var(--fg-2)]">
        entrada {formatDateTime(record.checkinAt, locale)}
      </span>
      <span className="text-[0.875rem] text-navy">
        {statedDurationLabel(record, runsAt)}
      </span>
      {record.checkoutAt && (
        <Chip tone={peloSistema ? "info" : "neutral"}>
          {peloSistema ? "fechada pela rotina" : `fechada por ${record.checkoutDoneBy}`}
        </Chip>
      )}
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Saída automática"
      subtitle="A rotina fecha a lista, e carimba a duração junto"
      breadcrumb={[{ label: "Na Clínica", path: "/in-clinic" }, { label: "Saída automática" }]}
    >
      {children}
    </AppShell>
  );
}
