import type { ScreenProps } from "@brucesantos/design-space";
import type { ManagementData, ReportControl } from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
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
  canOpenManagement,
  daysLate,
  daysWithoutOwner,
  fronts,
  isBlocking,
  isOverdue,
  mentorshipConsequence,
  overdueConsequence,
  reportQueue,
  reportTypeLabel,
  requesterLabel,
} from "../rules/management.js";

/**
 * Gerência.
 *
 * A tela de gerência do Bloomy tem nove abas, e é fácil lê-la como um painel de
 * indicadores. Ela não é: cada aba é uma **fila de trabalho** com um dono e uma
 * consequência para o que fica parado.
 *
 * Duas decisões seguem daí:
 *
 * 1. **Cada frente diz de quem é.** Nove listas numa tela só viram ruído se não
 *    estiver dito de quem é cada uma. O que decide se alguém age não é o número
 *    — é saber que o número é seu.
 *
 * 2. **A fila de relatórios é ordenada por consequência, não por data.** Um
 *    atraso de nove dias pedido pela operadora segura faturamento; um de catorze
 *    pedido pela família não trava nada no sistema e custa a relação. O mais
 *    antigo não é o mais urgente, e a tela precisa dizer por quê.
 */
export function Management({ context }: ScreenProps) {
  const { data, isLoading, error, locale, permissions } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a gerência" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const access = canOpenManagement(permissions);
  if (!access.allowed) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso à gerência"
        description="A gerência é de admin, admin de clínica e coordenação. Fale com quem administra os acessos da unidade."
      />,
    );
  }

  const management = data as ManagementData | null;
  if (!management) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const queue = reportQueue(management);
  const panels = fronts(management);
  const pending = panels.filter((front) => front.count > 0);

  if (pending.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma pendência nas frentes acompanhadas"
        description="Relatórios em dia, todo aplicador com supervisor, cadastros completos e todo paciente com responsável clínico. É a segunda em que dá para fechar esta tela."
      />,
      management,
    );
  }

  return wrap(
    context,
    <div className="space-y-4">
      {/* ------------------------------------------------------- frentes */}
      <Card as="section">
        <CardHeader
          title="Frentes com pendência"
          hint="Cada uma tem um dono — fila sem dono é fila que ninguém trabalha"
        />
        <div className="px-5 py-5">
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {/* Frente zerada é dita com palavra, não com opacidade. Baixar a
                opacidade do texto derruba o contraste abaixo de AA — foi
                exatamente o que o axe pegou aqui na primeira versão. */}
            {panels.map((front) => (
              <li
                key={front.id}
                className={`rounded-field border px-4 py-3 ${
                  front.blocking
                    ? "border-danger-fg/35 bg-danger-bg"
                    : "border-[var(--border-soft)]"
                }`}
              >
                <p className="m-0 text-[24px] font-bold text-navy">{front.count}</p>
                <p className="m-0 text-[15px] font-semibold text-navy">{front.title}</p>
                <p className="m-0 mt-0.5 text-[13px] text-[var(--fg-2)]">
                  {front.count === 0 ? "em dia" : front.owner}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* ---------------------------------------------------- relatórios */}
      {queue.length > 0 && (
        <Card as="section">
          <CardHeader
            title="Relatórios"
            hint="Ordenados por consequência do atraso, não por data de vencimento"
          />
          <div className="px-5 py-5">
            <ul className="m-0 list-none space-y-3 p-0">
              {queue.map((report) => (
                <ReportRow
                  key={report.id}
                  report={report}
                  now={management.now}
                  locale={locale}
                />
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* ---------------------------------------------------- supervisão */}
      {management.mentorshipGaps.length > 0 && (
        <Card as="section">
          <CardHeader title="Supervisão" hint="Vínculos faltando ou sem uso" />
          <div className="px-5 py-5">
            <ul className="m-0 list-none space-y-3 p-0">
              {management.mentorshipGaps.map((gap) => (
                <li
                  key={gap.professionalId}
                  className={`rounded-field border px-4 py-3 ${
                    isBlocking(gap) ? "border-danger-fg/35 bg-danger-bg" : "border-[var(--border-soft)]"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[15px] font-semibold text-navy">
                      {gap.professionalName}
                    </span>
                    <span className="text-[13px] text-[var(--fg-2)]">{gap.specialty}</span>
                    {isBlocking(gap) && <Chip tone="danger">Trava fechamento de sessão</Chip>}
                  </div>
                  <p className="m-0 mt-1 max-w-[72ch] text-[14px] text-navy">
                    {mentorshipConsequence(gap)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------ cadastros */}
      {management.incompleteProfessionals.length > 0 && (
        <Card as="section">
          <CardHeader title="Cadastros de profissional incompletos" hint="Responsável: People" />
          <div className="px-5 py-5">
            <ul className="m-0 list-none space-y-2 p-0">
              {management.incompleteProfessionals.map((professional) => (
                <li key={professional.id} className="text-[15px] text-navy">
                  <span className="font-semibold">{professional.name}</span>{" "}
                  <span className="text-[13px] text-[var(--fg-2)]">{professional.specialty}</span>
                  <span className="block text-[14px] text-[var(--fg-2)]">
                    Falta {professional.missing.join(", ")}.
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* -------------------------------------------------- sem responsável */}
      {management.patientsWithoutOwner.length > 0 && (
        <Card as="section">
          <CardHeader
            title="Pacientes sem responsável clínico"
            hint="Nada trava — e é justamente esse o problema"
          />
          <div className="px-5 py-5">
            <Notice tone="warn" title="O atendimento continua sem ninguém respondendo pelo caso" level={3}>
              As sessões acontecem, os programas rodam, e não há quem revise a evolução ou decida
              mudança de fase.
            </Notice>
            <ul className="m-0 mt-3 list-none space-y-2 p-0">
              {management.patientsWithoutOwner.map((patient) => (
                <li key={patient.id} className="text-[15px] text-navy">
                  <span className="font-semibold">{patient.name}</span>{" "}
                  <span className="text-[14px] text-[var(--fg-2)]">
                    há {daysWithoutOwner(patient.sinceDate, management.now)} dias · unidade{" "}
                    {patient.unitName}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </div>,
    management,
  );
}

function ReportRow({
  report,
  now,
  locale,
}: {
  report: ReportControl;
  now: string;
  locale: string | undefined;
}) {
  const overdue = isOverdue(report, now);
  const late = daysLate(report, now);

  return (
    <li
      className={`rounded-field border px-4 py-3 ${
        overdue && report.requester === "operator"
          ? "border-danger-fg/35 bg-danger-bg"
          : overdue
            ? "border-warn-fg/35 bg-warn-bg"
            : "border-[var(--border-soft)]"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[15px] font-semibold text-navy">{report.patientName}</span>
        <span className="text-[14px] text-navy">{reportTypeLabel(report.reportType)}</span>
        <Chip tone={report.requester === "operator" ? "warn" : "info"}>
          Pedido por: {requesterLabel(report.requester)}
        </Chip>
        {overdue && <Chip tone="danger">Atrasado {late} dias</Chip>}
      </div>

      <p className="m-0 mt-0.5 text-[13px] text-[var(--fg-2)]">
        {report.professionalName} · vence em{" "}
        {formatDate(`${report.dueDate}T12:00:00.000-03:00`, locale)}
      </p>

      {/* A consequência concreta, e não um rótulo de severidade: é ela que faz
          alguém priorizar entre dois atrasos parecidos. */}
      {overdue && (
        <p className="m-0 mt-1.5 max-w-[72ch] text-[14px] text-navy">
          {overdueConsequence(report)}
        </p>
      )}

      {report.observations && (
        <p className="m-0 mt-1.5 max-w-[72ch] rounded-field bg-ink-50 px-3 py-2 text-[13px] text-navy">
          {report.observations}
        </p>
      )}
    </li>
  );
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  management?: ManagementData,
) {
  return (
    <AppShell
      context={context}
      title="Gerência"
      subtitle={management ? `Unidade ${management.unit.name}` : undefined}
      breadcrumb={[{ label: "Gerência" }]}
    >
      {children}
    </AppShell>
  );
}
