import type { ScreenProps } from "@brucesantos/design-space";
import type { AttendanceRow, InsurerPortalData } from "../contracts/index.js";
import { formatDate, formatTime } from "../contracts/index.js";
import simbolo from "../assets/bloomy-symbol-negative.svg";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
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
      <Card as="section">
        <div className="p-5">
          <h2 className="m-0 text-2xl font-bold text-navy">Lista de Presença</h2>

          <form className="mt-6" onSubmit={(event) => event.preventDefault()}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field label="Formato">
                <select className={fieldClass} defaultValue="schedule">
                  <option value="schedule">Baseado em Presença</option>
                  <option value="custom_service">Baseado em Atendimento</option>
                </select>
              </Field>

              <Field label="Período">
                <input
                  className={fieldClass}
                  type="text"
                  defaultValue={`${br(portal.period.start)} - ${br(portal.period.end)}`}
                  aria-label="Período"
                />
              </Field>

              <Field label="Paciente">
                <select className={fieldClass} defaultValue="">
                  <option value="">Todos</option>
                  {portal.patients.map(({ patient }) => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Unidade">
                <input className={`${fieldClass} bg-ink-50`} value="Vila Aurora" readOnly />
              </Field>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-action px-4 py-2 font-bold text-white hover:bg-action-hover"
              >
                <Icon name="fa-search" />
                Gerar
              </button>
            </div>
          </form>
        </div>
      </Card>

      <h2 className="m-0 pt-4 text-xl font-bold text-navy">Detalhamento da situação</h2>

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
            <p className="m-0 mt-4 max-w-[72ch] text-[0.875rem] text-navy">
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
            <p className="m-0 text-[0.9375rem] text-navy">
              Nenhum atendimento de beneficiário desta operadora no período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[0.875rem]">
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
          <p className="m-0 max-w-[72ch] text-[0.9375rem] text-navy">
            A operadora confere a prestação do serviço: que o atendimento aconteceu, quem conduziu e
            quando. O conteúdo clínico é do paciente e da clínica, e não acompanha a cobrança.
          </p>
          <ul className="m-0 mt-3 list-disc space-y-1 pl-5 text-[0.9375rem] text-navy">
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

const fieldClass =
  "min-h-11 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2 text-navy";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-navy">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
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
      <dt className="text-[0.8125rem] text-[var(--fg-2)]">{label}</dt>
      <dd className={`m-0 text-[1.5rem] font-bold ${color}`}>{value}</dd>
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
        <span className="block text-[0.8125rem] text-[var(--fg-2)]">
          {formatTime(row.start, locale)} às {formatTime(row.end, locale)}
        </span>
      </td>
      <td className="py-2.5 pr-4 text-navy">{row.patientName}</td>
      <td className="py-2.5 pr-4 text-navy">
        {row.professionalName}
        {row.professionalRegister && (
          <span className="block text-[0.8125rem] text-[var(--fg-2)]">{row.professionalRegister}</span>
        )}
      </td>
      <td className="py-2.5 pr-4">
        <ScheduleStatusChip status={row.status} />
        {!delivered && reason && (
          <span className="mt-1 block text-[0.8125rem] text-[var(--fg-2)]">{reason}</span>
        )}
      </td>
      <td className="py-2.5">
        {row.signedBy ? (
          <span className="text-navy">
            {row.signedBy}
            {row.signedAt && (
              <span className="block text-[0.8125rem] text-[var(--fg-2)]">
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
      showPageHeading={false}
    >
      <HealthCareFrame portal={portal}>
        {children}
      </HealthCareFrame>
    </AppShell>
  );
}

const HEALTH_CARE_NAV = [
  { label: "Pacientes", icon: "fa-users" },
  { label: "Atendimentos", icon: "fa-calendar-pen" },
  { label: "Agendamentos", icon: "fa-calendar-day" },
  { label: "Lista de Presença", icon: "fa-square-list" },
] as const;

function HealthCareFrame({
  portal,
  children,
}: {
  portal?: InsurerPortalData;
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-4 -my-6 flex min-h-screen bg-app lg:-mx-8">
      <nav
        className="espelho-do-sistema sticky top-0 hidden h-screen w-[72px] shrink-0 flex-col bg-[var(--color-brand-blue)] p-2 md:flex"
        aria-label="Navegação da operadora"
      >
        <img
          src={simbolo}
          alt="Bloomy"
          className="mx-auto mb-8 mt-4 h-12 w-12"
        />
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {HEALTH_CARE_NAV.map((item) => {
            const current = item.label === "Lista de Presença";
            return (
              <li key={item.label}>
                <span
                  className={`mx-auto flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white ${current ? "bg-[var(--color-brand-blue-dark)]" : ""}`}
                  title={item.label}
                >
                  <Icon name={item.icon} />
                  <span className="sr-only">
                    {item.label}{current ? ", página atual" : ", não portado"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between bg-white px-4 py-4 shadow-main lg:px-8">
          <button
            type="button"
            className="hidden h-5 w-5 items-center justify-center text-[var(--color-brand-purple-dark)]/60 md:flex"
            aria-label="Expandir a navegação"
          >
            <Icon name="fa-sidebar" />
          </button>

          <div className="ml-auto flex items-center gap-x-4 md:gap-x-6">
            <div className="flex items-center gap-2">
              <p className="espelho-do-sistema m-0 hidden text-end text-sm md:block">
                <span className="block text-base/4 font-black text-[var(--color-green)]">Unidade</span>
                Vila Aurora
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-green)]/20">
                <Icon name="fa-hospital" className="text-[var(--color-green)]" />
              </span>
            </div>

            <div className="flex items-center gap-2">
              <p className="espelho-do-sistema m-0 hidden text-end text-sm md:block">
                <span className="block text-base/4 font-black text-[var(--color-brand-blue-dark)]">
                  {portal?.healthCare.name ?? "Operadora"}
                </span>
                Bem-vindo(a)
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-brand-purple)]/20">
                <Icon name="fa-user-tie" className="text-[var(--color-purple)]" />
              </span>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
