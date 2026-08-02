import type { ScreenProps } from "@brucesantos/design-space";
import type { PatientReport, ReportsData } from "../contracts/index.js";
import { formatDate, formatDateTime } from "../contracts/index.js";
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
  attendanceHasClinicalContent,
  canEditReport,
  canGeneratePdf,
  canIssue,
  carriesClinicalContent,
  destination,
  issuingWithoutReading,
  missingAttendanceFields,
  reportTypeLabel,
  statusLabel,
} from "../rules/reports.js";

/**
 * Relatórios do paciente.
 *
 * Sete tipos que saem por um botão só, e o que muda entre eles não é o formato:
 * é **para onde o documento vai** depois de gerado. Um relatório é a coisa mais
 * fácil de o produto emitir e a mais difícil de recolher.
 *
 * Três decisões seguem daí:
 *
 * 1. **O destinatário aparece em cada tipo.** Não está no schema — é
 *    conhecimento do domínio que esta especificação acrescenta, porque é o que
 *    decide o cuidado com o conteúdo. Sem isso, o handoff produz sete telas
 *    iguais.
 *
 * 2. **A declaração de comparecimento é tratada à parte.** É o único tipo que
 *    sai do circuito da saúde, e o campo de conteúdo aceita qualquer coisa. A
 *    tela avisa antes de gerar o PDF.
 *
 * 3. **O descompasso de permissão é declarado, não corrigido.** No sistema real,
 *    quem pode emitir emite os sete tipos, mesmo sem alcançar o prontuário.
 *    Bloquear aqui esconderia a decisão; mostrá-la é o que permite tomá-la.
 */
export function Reports({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando os relatórios" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const reportsData = data as ReportsData | null;
  if (!reportsData) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const issue = canIssue(reportsData.currentRole);
  if (!issue.allowed && reportsData.reports.length === 0) {
    return wrap(
      context,
      <EmptyState title="Você não emite relatórios" description={issue.reason!} />,
      reportsData,
    );
  }

  if (reportsData.reports.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum relatório emitido"
        description="Aqui ficam os documentos que a clínica emite sobre o paciente — declaração de comparecimento, relatório evolutivo, relatório para a operadora e os demais tipos."
      />,
      reportsData,
    );
  }

  const mismatches = [
    ...new Set(
      reportsData.reports
        .map((report) => issuingWithoutReading(report.reportType, reportsData.currentRole))
        .filter((message): message is string => message !== undefined),
    ),
  ];

  return wrap(
    context,
    <div className="space-y-4">
      {mismatches.length > 0 && (
        <Notice tone="warn" title="A permissão de emitir não verifica a de ler">
          {mismatches.map((message) => (
            <p key={message} className="m-0">
              {message}
            </p>
          ))}
          <p className="m-0 mt-2">
            É assim no sistema real. Está declarado aqui para a decisão ser tomada de propósito, em
            vez de herdada — bloquear sem discutir esconderia a escolha.
          </p>
        </Notice>
      )}

      <ul className="m-0 list-none space-y-3 p-0">
        {reportsData.reports.map((report) => (
          <li key={report.id}>
            <ReportCard report={report} locale={locale} />
          </li>
        ))}
      </ul>
    </div>,
    reportsData,
  );
}

function ReportCard({
  report,
  locale,
}: {
  report: PatientReport;
  locale: string | undefined;
}) {
  const target = destination(report.reportType);
  const missing = missingAttendanceFields(report);
  const leaking = attendanceHasClinicalContent(report);
  const edit = canEditReport(report);
  const pdf = canGeneratePdf(report);

  return (
    <Card as="article">
      <CardHeader title={report.name} hint={reportTypeLabel(report.reportType)} />
      <div className="space-y-3 px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            tone={
              report.status === "generated_pdf"
                ? "ok"
                : report.status === "cancelled"
                  ? "neutral"
                  : "info"
            }
          >
            {statusLabel(report.status)}
          </Chip>
          {carriesClinicalContent(report.reportType) ? (
            <Chip tone="warn">Leva conteúdo clínico</Chip>
          ) : (
            <Chip tone="neutral">Sem conteúdo clínico</Chip>
          )}
        </div>

        {/* O destinatário não está no schema. Está aqui porque é o que decide o
            cuidado com o conteúdo — e sem ele o handoff produz sete telas
            iguais. */}
        <p className="m-0 max-w-[68ch] text-[15px] text-navy">
          <span className="font-semibold">Vai para:</span> {target.who}.
        </p>

        {leaking && (
          <Notice tone="danger" title="Conteúdo clínico numa declaração de comparecimento" level={3}>
            Este é o único tipo que sai do circuito da saúde — vai para um empregador ou para a
            escola. O que ele precisa provar é que a pessoa esteve na clínica naquele horário, e o
            campo de conteúdo aceita qualquer coisa sem reclamar.
          </Notice>
        )}

        {report.attendance && (
          <dl className="m-0 grid grid-cols-[minmax(140px,auto)_1fr] gap-x-6 gap-y-1.5 text-[14px]">
            <dt className="text-[var(--fg-2)]">Data</dt>
            <dd className="m-0 text-navy">
              {report.attendance.date
                ? formatDate(`${report.attendance.date}T12:00:00.000-03:00`, locale)
                : em()}
            </dd>
            <dt className="text-[var(--fg-2)]">Horário</dt>
            <dd className="m-0 text-navy">
              {report.attendance.startTime || "—"} às {report.attendance.endTime || em()}
            </dd>
            <dt className="text-[var(--fg-2)]">Responsável</dt>
            <dd className="m-0 text-navy">{report.attendance.guardianName || em()}</dd>
          </dl>
        )}

        {report.period && (
          <p className="m-0 text-[14px] text-navy">
            Período de {formatDate(`${report.period.start}T12:00:00.000-03:00`, locale)} a{" "}
            {formatDate(`${report.period.end}T12:00:00.000-03:00`, locale)}.
          </p>
        )}

        {/* O texto do relatório. Congelar depois do PDF é sobre escrita: o
            conteúdo continua legível, e é ele que alguém vai conferir contra o
            papel que saiu. */}
        {report.content && report.reportType !== "declaration_of_attendance" && (
          <div className="rounded-field bg-ink-50 px-4 py-3">
            <h3 className="m-0 text-[13px] font-bold uppercase tracking-wide text-[var(--fg-2)]">
              Conteúdo
            </h3>
            <p className="m-0 mt-1 max-w-[68ch] text-[15px] leading-relaxed text-navy">
              {report.content}
            </p>
          </div>
        )}

        <p className="m-0 text-[13px] text-[var(--fg-2)]">
          Criado por {report.authorName} em {formatDateTime(report.createdAt, locale)}
          {report.ownerName && report.ownerName !== report.authorName && (
            <> · responde pelo documento: {report.ownerName}</>
          )}
        </p>

        {missing.length > 0 && (
          <Notice tone="pending" title="Declaração incompleta" level={3}>
            Falta {missing.join(", ")}. Sem esses campos, a declaração não prova que a pessoa esteve
            na clínica.
          </Notice>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            id={`pdf-${report.id}`}
            variant="primary"
            unavailableReason={pdf.allowed ? undefined : pdf.reason}
          >
            Gerar PDF
          </Button>
          <Button id={`editar-${report.id}`} unavailableReason={edit.allowed ? undefined : edit.reason}>
            Editar
          </Button>
        </div>
      </div>
    </Card>
  );
}

function em() {
  return <span className="font-semibold text-pending-fg">não preenchido</span>;
}

function wrap(context: ScreenProps["context"], children: React.ReactNode, reportsData?: ReportsData) {
  return (
    <AppShell
      context={context}
      title="Relatórios"
      subtitle={reportsData?.reports[0]?.patientName}
      breadcrumb={[{ label: "Pacientes", path: "/patients" }, { label: "Relatórios" }]}
    >
      {children}
    </AppShell>
  );
}
