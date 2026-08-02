import type { ScreenProps } from "@brucesantos/design-space";
import type { ClinicHour, ClinicalHourRecord, ClinicalHoursData } from "../contracts/index.js";
import { formatDate, formatMoney } from "../contracts/index.js";
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
  attributionLabel,
  attributionOf,
  canEditHours,
  expectedMinutes,
  expectedWithoutEnd,
  formatMinutes,
  minutesLostToTruncation,
  monthlyLossHours,
  openHours,
  reversedHours,
  spanMinutes,
  storedExpectedHours,
  verificationLabel,
  verificationState,
  workedMinutes,
} from "../rules/clinicalHours.js";

/**
 * Controle de horas.
 *
 * A tela em que um erro vira dinheiro. Cada dia tem horas previstas, horas
 * trabalhadas e um valor diário esperado, e o que separa as três é aritmética
 * que ninguém confere — porque cada linha isolada erra pouco.
 *
 * Três decisões seguem daí:
 *
 * 1. **A hora prevista aparece duas vezes: como está gravada e como é.** O
 *    sistema soma em segundos e divide com `div`, que trunca, numa coluna
 *    inteira. 7h30 vira 7. Mostrar só o número gravado tornaria a perda
 *    impossível de notar; mostrar os dois lado a lado a torna óbvia.
 *
 * 2. **Quem marcou faz parte do registro.** `checkin_done_by` e
 *    `checkout_done_by` são a única coisa que distingue hora registrada de hora
 *    atribuída — e o caso interessante, dia aberto no app e fechado no
 *    escritório, já está gravado e não é mostrado em lugar nenhum.
 *
 * 3. **Verificação ausente é um estado, não o vazio.** Sem coordenadas o
 *    check-in passa e nada é dito, então o registro fica com a mesma aparência
 *    de um verificado. Aqui ele diz que não sabe.
 */
export function ClinicalHours({ context }: ScreenProps) {
  const { data, isLoading, error, locale, permissions } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando o controle de horas" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const hours = data as ClinicalHoursData | null;
  if (!hours) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (hours.records.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum registro no período"
        description="Cada dia trabalhado vira um registro, com as faixas previstas, as faixas efetivamente marcadas e o valor diário esperado. O primeiro aparece aqui depois do primeiro check-in."
      />,
    );
  }

  const edit = canEditHours(permissions);

  return wrap(
    context,
    <div className="space-y-4">
      <Card as="section">
        <CardHeader title="O que esta tela decide" hint={`${hours.records.length} ${hours.records.length === 1 ? "dia" : "dias"}`} />
        <div className="space-y-3 px-5 py-5">
          <p className="m-0 max-w-[68ch] text-[0.9375rem] text-navy">
            É a tela em que um erro vira dinheiro. Cada linha compara o que estava previsto com o
            que foi marcado, e o valor diário sai daí.
          </p>
          <Button id="editar-horas" unavailableReason={edit.allowed ? undefined : edit.reason}>
            Corrigir um registro
          </Button>
        </div>
      </Card>

      <ul className="m-0 list-none space-y-3 p-0">
        {hours.records.map((record) => (
          <li key={record.id}>
            <RecordCard record={record} locale={locale} />
          </li>
        ))}
      </ul>
    </div>,
  );
}

function RecordCard({
  record,
  locale,
}: {
  record: ClinicalHourRecord;
  locale: string | undefined;
}) {
  const previstoReal = expectedMinutes(record.expectedClinicHours);
  const previstoGravado = storedExpectedHours(record.expectedClinicHours);
  const perdido = minutesLostToTruncation(record.expectedClinicHours);
  const trabalhado = workedMinutes(record.clinicHours);
  const invertidas = reversedHours(record.clinicHours);
  const abertas = openHours(record.clinicHours);
  const semFim = expectedWithoutEnd(record.expectedClinicHours);
  const verificacao = verificationState(record);

  return (
    <Card as="article">
      <CardHeader
        title={formatDate(`${record.date}T12:00:00.000-03:00`, locale)}
        hint={`${record.professionalName} · ${record.unitName}`}
      />
      <div className="space-y-4 px-5 py-5">
        {/* --------------------------------------------------- os números */}
        <dl className="m-0 grid grid-cols-[minmax(160px,auto)_1fr] gap-x-6 gap-y-1.5 text-[0.9375rem]">
          <dt className="text-[var(--fg-2)]">Previsto</dt>
          <dd className="m-0 text-navy">
            {formatMinutes(previstoReal)}
            {perdido > 0 && (
              <>
                {" "}
                <span className="font-semibold text-warn-fg">
                  · gravado como {previstoGravado}h
                </span>
              </>
            )}
          </dd>
          <dt className="text-[var(--fg-2)]">Trabalhado</dt>
          <dd className="m-0 text-navy">{formatMinutes(trabalhado)}</dd>
          {record.expectedDailyPaymentCents !== undefined && (
            <>
              <dt className="text-[var(--fg-2)]">Valor diário previsto</dt>
              <dd className="m-0 text-navy">
                {formatMoney(record.expectedDailyPaymentCents, locale)}
              </dd>
            </>
          )}
        </dl>

        {/* O truncamento é dito onde o número é lido, e projetado no mês —
            porque meia hora isolada não convence ninguém a olhar. */}
        {perdido > 0 && (
          <Notice tone="warn" title={`${formatMinutes(perdido)} somem no arredondamento`} level={3}>
            <p className="m-0">
              As horas previstas são somadas em segundos e divididas com truncamento, numa coluna
              inteira. {formatMinutes(previstoReal)} viram {previstoGravado}, e a fração não cabe
              nem no tipo do campo.
            </p>
            <p className="m-0 mt-2">
              O arredondamento vai sempre para o mesmo lado. Repetido num mês de vinte e dois dias
              úteis, dá{" "}
              <span className="font-semibold">
                {monthlyLossHours(record.expectedClinicHours)} horas
              </span>{" "}
              — que é quando alguém finalmente nota.
            </p>
          </Notice>
        )}

        {semFim.length > 0 && (
          <Notice tone="danger" title="Faixa prevista sem hora de fim" level={3}>
            {semFim.map((entry) => `a partir das ${entry.startAt}`).join(", ")}. O cadastro aceita
            uma previsão sem fim e o recálculo das horas não a processa — o erro aparece na hora de
            recalcular, longe de quem salvou.
          </Notice>
        )}

        {invertidas.length > 0 && (
          <Notice tone="danger" title="Saída anterior à entrada" level={3}>
            <p className="m-0">
              {invertidas
                .map((hour) => `das ${hour.startAt} às ${hour.endAt}`)
                .join(", ")}
              . Nada compara o fim com o começo: a faixa é aceita e a diferença negativa entra na
              soma do dia.
            </p>
            <p className="m-0 mt-2">
              Por isso o total trabalhado aqui é {formatMinutes(trabalhado)} — menor que a primeira
              faixa sozinha.
            </p>
          </Notice>
        )}

        {abertas.length > 0 && (
          <Notice tone="pending" title="Jornada em aberto" level={3}>
            Entrada às {abertas.map((hour) => hour.startAt).join(", ")} sem saída registrada. Este
            dia ainda não fecha, e o valor diário previsto não se confirma.
          </Notice>
        )}

        {/* ------------------------------------------------------- faixas */}
        <div>
          <h3 className="m-0 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--fg-2)]">
            Faixas marcadas
          </h3>
          <ul className="m-0 mt-2 list-none space-y-2 p-0">
            {record.clinicHours.map((hour) => (
              <li key={hour.id}>
                <HourRow hour={hour} />
              </li>
            ))}
          </ul>
        </div>

        {/* Verificação ausente é um estado que a tela nomeia, e não o vazio. */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            tone={
              verificacao === "verified" ? "ok" : verificacao === "half" ? "pending" : "warn"
            }
          >
            {verificationLabel(verificacao)}
          </Chip>
        </div>

        {verificacao !== "verified" && (
          <p className="m-0 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
            A localização só é gravada quando o aparelho manda as coordenadas, e o resultado da
            gravação é descartado. GPS desligado, permissão negada ou falha na inserção: o check-in
            dá certo e nada é dito. Sem esta frase, o registro teria a mesma aparência de um
            verificado.
          </p>
        )}

        {record.observation && (
          <p className="m-0 max-w-[68ch] text-[0.875rem] text-navy">{record.observation}</p>
        )}
      </div>
    </Card>
  );
}

function HourRow({ hour }: { hour: ClinicHour }) {
  const span = spanMinutes(hour);
  const attribution = attributionOf(hour);

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-field border border-[var(--border-soft)] px-4 py-2.5">
      <span className="text-[0.9375rem] font-semibold text-navy">
        {hour.startAt} às {hour.endAt ?? "—"}
      </span>
      {span !== undefined && (
        <span className={`text-[0.875rem] ${span < 0 ? "font-semibold text-danger-fg" : "text-navy"}`}>
          {formatMinutes(span)}
        </span>
      )}
      {/* Hora registrada e hora atribuída pesam diferente numa conferência, e
          a diferença já está gravada. */}
      <Chip tone={attribution === "self" ? "neutral" : "info"}>
        {attributionLabel(attribution)}
      </Chip>
    </div>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Controle de horas"
      subtitle="Previsto, marcado, e quem marcou"
      breadcrumb={[{ label: "Equipe", path: "/team" }, { label: "Controle de horas" }]}
    >
      {children}
    </AppShell>
  );
}
