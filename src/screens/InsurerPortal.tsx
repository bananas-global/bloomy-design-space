import type { ScreenProps } from "@brucesantos/design-space";
import type { AttendanceRow, InsurerPortalData } from "../contracts/index.js";
import { formatDate, formatTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Card,
  CardHeader,
  Chip,
  ErrorState,
  LoadingState,
  Notice,
  ScheduleStatusChip,
} from "../components/primitives.js";
import {
  NOT_SHARED_WITH_INSURER,
  attendanceSummary,
  hiddenFromInsurer,
  notDeliveredReason,
  wasDelivered,
} from "../rules/insurerPortal.js";

/**
 * Portal da operadora.
 *
 * O único lugar do produto em que dados de uma clínica são mostrados a uma
 * organização de fora. Isso torna o que **não** aparece tão projetado quanto o
 * que aparece — e a tela diz isso em voz alta, porque a ausência silenciosa de
 * informação clínica pareceria uma lacuna do produto em vez de uma decisão.
 *
 * Duas outras decisões:
 *
 * 1. **A contagem separa o que fechou do que aconteceu.** Um atendimento
 *    pendente de assinatura ocorreu, mas ainda não fechou; contá-lo como
 *    prestado antecipa a cobrança. Ele aparece na lista, fora do total.
 *
 * 2. **A omissão do escopo é declarada.** O `scope/2` do monólito esconde
 *    agendamentos incompletos sem dizer nada — e é exatamente essa omissão
 *    silenciosa que torna a conciliação impossível quando os números não batem.
 */
export function InsurerPortal({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a lista de presença" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const portal = data as InsurerPortalData | null;
  if (!portal) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const summary = attendanceSummary(portal);
  const hidden = hiddenFromInsurer(portal);

  return wrap(
    context,
    <div className="space-y-4">
      {hidden > 0 && (
        <Notice
          tone="warn"
          title={`${hidden} ${hidden === 1 ? "agendamento do período não aparece" : "agendamentos do período não aparecem"} nesta lista`}
        >
          Agendamentos com situação Incompleto ficam fora do que a operadora enxerga. No sistema
          atual esse filtro é silencioso — nada indica que houve omissão, e é isso que torna a
          conciliação impossível quando os números não batem. Aqui ele está declarado de propósito,
          para a decisão de escondê-los ser discutida em vez de herdada.
        </Notice>
      )}

      {/* ------------------------------------------------------- resumo */}
      <Card as="section">
        <CardHeader
          title={`Lista de presença · ${portal.healthCare.name}`}
          hint={`Competência de ${br(portal.period.start)} a ${br(portal.period.end)}`}
        />
        <div className="px-5 py-5">
          <dl className="m-0 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Atendimentos prestados" value={summary.delivered} tone="ok" />
            <Metric label="Aguardando fechamento" value={summary.pendingClosure} tone="pending" />
            <Metric label="Faltas" value={summary.missed} tone="warn" />
            <Metric label="Cancelamentos" value={summary.cancelled} tone="neutral" />
          </dl>

          {summary.pendingClosure > 0 && (
            <p className="m-0 mt-4 max-w-[72ch] text-[14px] text-navy">
              Os {summary.pendingClosure} atendimentos aguardando fechamento{" "}
              <strong>aconteceram</strong> e ainda não têm assinatura completa. Não entram no total
              prestado hoje, e entram assim que fecharem — é a diferença mais comum entre o que a
              clínica cobra e o que a operadora conta.
            </p>
          )}
        </div>
      </Card>

      {/* ---------------------------------------------------- presença */}
      <Card as="section">
        <CardHeader
          title="Atendimentos do período"
          hint={`${portal.attendance.length} ${portal.attendance.length === 1 ? "linha" : "linhas"}`}
        />
        <div className="px-5 py-5">
          {portal.attendance.length === 0 ? (
            <p className="m-0 text-[15px] text-navy">
              Nenhum atendimento de beneficiário desta operadora no período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[14px]">
                <caption className="sr-only">
                  Atendimentos de beneficiários da {portal.healthCare.name} entre{" "}
                  {br(portal.period.start)} e {br(portal.period.end)}
                </caption>
                <thead>
                  <tr className="border-b border-[var(--border-strong)] text-left">
                    <th scope="col" className="py-2 pr-4 font-semibold text-navy">Data</th>
                    <th scope="col" className="py-2 pr-4 font-semibold text-navy">Paciente</th>
                    <th scope="col" className="py-2 pr-4 font-semibold text-navy">Profissional</th>
                    <th scope="col" className="py-2 pr-4 font-semibold text-navy">Situação</th>
                    <th scope="col" className="py-2 font-semibold text-navy">Assinatura</th>
                  </tr>
                </thead>
                <tbody>
                  {portal.attendance.map((item) => (
                    <Row key={item.id} row={item} locale={locale} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* ------------------------------------------ o que não é enviado */}
      <Card as="section">
        <CardHeader
          title="O que não aparece aqui"
          hint="Decisão de privacidade, não lacuna do sistema"
        />
        <div className="px-5 py-5">
          <p className="m-0 max-w-[72ch] text-[15px] text-navy">
            A operadora confere a prestação do serviço: que o atendimento aconteceu, quem conduziu e
            quando. O conteúdo clínico é do paciente e da clínica, e não acompanha a cobrança.
          </p>
          <ul className="m-0 mt-3 list-disc space-y-1 pl-5 text-[15px] text-navy">
            {NOT_SHARED_WITH_INSURER.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </Card>
    </div>,
    portal,
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "pending" | "warn" | "neutral";
}) {
  const color = {
    ok: "text-ok-fg",
    pending: "text-pending-fg",
    warn: "text-warn-fg",
    neutral: "text-navy",
  }[tone];

  return (
    <div>
      <dt className="text-[13px] text-[var(--fg-2)]">{label}</dt>
      <dd className={`m-0 text-[24px] font-bold ${color}`}>{value}</dd>
    </div>
  );
}

function Row({ row, locale }: { row: AttendanceRow; locale: string | undefined }) {
  const delivered = wasDelivered(row);
  const reason = notDeliveredReason(row);

  return (
    <tr className="border-b border-[var(--border-soft)] align-top">
      <td className="py-2.5 pr-4 text-navy">
        {formatDate(row.start, locale)}
        <span className="block text-[13px] text-[var(--fg-2)]">
          {formatTime(row.start, locale)} às {formatTime(row.end, locale)}
        </span>
      </td>
      <td className="py-2.5 pr-4 text-navy">{row.patientName}</td>
      <td className="py-2.5 pr-4 text-navy">
        {row.professionalName}
        {row.professionalRegister && (
          <span className="block text-[13px] text-[var(--fg-2)]">{row.professionalRegister}</span>
        )}
      </td>
      <td className="py-2.5 pr-4">
        <ScheduleStatusChip status={row.status} />
        {!delivered && reason && (
          <span className="mt-1 block text-[13px] text-[var(--fg-2)]">{reason}</span>
        )}
      </td>
      <td className="py-2.5">
        {row.signedBy ? (
          <span className="text-navy">
            {row.signedBy}
            {row.signedAt && (
              <span className="block text-[13px] text-[var(--fg-2)]">
                {formatDate(row.signedAt, locale)}
              </span>
            )}
          </span>
        ) : (
          <Chip tone="pending">Sem assinatura</Chip>
        )}
      </td>
    </tr>
  );
}

function br(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  portal?: InsurerPortalData,
) {
  return (
    <AppShell
      context={context}
      title={portal?.healthCare.name ?? "Portal da operadora"}
      subtitle="Conferência de atendimentos"
      surface="standalone"
    >
      {children}
    </AppShell>
  );
}
