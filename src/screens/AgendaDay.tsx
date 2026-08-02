import type { ScreenProps } from "@brucesantos/design-space";
import type { AgendaData, Appointment } from "../contracts/index.js";
import { formatDate, formatTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  AppointmentStatusChip,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";

/**
 * Agenda do dia.
 *
 * A tela responde os cinco estados que o motor pode entregar. Isso não é zelo
 * excessivo: um handoff que só mostra o caminho felizmente é onde a engenharia
 * inventa o resto, e o vazio de agenda é justamente o estado que aparece todo
 * dia às sete da manhã.
 */
export function AgendaDay({ context }: ScreenProps) {
  const { data, isLoading, error, locale, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a agenda" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("schedules.list")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso à agenda"
        description="Seu perfil não inclui a permissão de leitura da agenda. Fale com quem administra os acessos da unidade."
      />,
    );
  }

  const agenda = data as AgendaData | null;
  const appointments = agenda?.appointments ?? [];
  const conflicted = appointments.filter((item) => (item.conflictsWith?.length ?? 0) > 0);

  if (appointments.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum atendimento marcado para hoje"
        description="Quando um horário for agendado, ele aparece aqui em ordem de início."
      />,
      agenda,
    );
  }

  return wrap(
    context,
    <div className="space-y-4">
      {conflicted.length > 0 && (
        <Notice
          tone="danger"
          title={`${conflicted.length === 1 ? "Um horário" : `${conflicted.length} horários`} em conflito`}
        >
          A mesma profissional tem atendimentos sobrepostos. Reagende um dos horários antes que os
          dois pacientes cheguem — a regra <code>no-double-booking</code> impede confirmar a
          sobreposição.
        </Notice>
      )}

      <Card className="overflow-hidden p-0">
        <table className="w-full border-collapse text-[15px]">
          <caption className="sr-only">
            Atendimentos de {formatDate(agenda!.date, locale)}, em ordem de horário
          </caption>
          <thead>
            <tr className="border-b border-[var(--border-soft)] text-left text-[12px] font-black uppercase tracking-wide text-[var(--fg-2)]">
              <th scope="col" className="px-5 py-3">
                Horário
              </th>
              <th scope="col" className="px-5 py-3">
                Paciente
              </th>
              <th scope="col" className="px-5 py-3">
                Procedimento
              </th>
              <th scope="col" className="px-5 py-3">
                Convênio
              </th>
              <th scope="col" className="px-5 py-3">
                Situação
              </th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                locale={locale}
                onOpen={() => context.navigate(`/agenda/${appointment.id}`)}
              />
            ))}
          </tbody>
        </table>
      </Card>
    </div>,
    agenda,
  );
}

function AppointmentRow({
  appointment,
  locale,
  onOpen,
}: {
  appointment: Appointment;
  locale: string | undefined;
  onOpen: () => void;
}) {
  const hasConflict = (appointment.conflictsWith?.length ?? 0) > 0;
  const isMuted = appointment.status === "cancelled" || appointment.status === "no_show";

  return (
    <tr
      className={[
        "border-b border-ink-50 last:border-0",
        hasConflict ? "bg-danger-bg/45" : "",
        isMuted ? "text-[var(--fg-2)]" : "",
      ].join(" ")}
    >
      <td className="px-5 py-4 align-top tabular-nums font-semibold text-navy">
        {formatTime(appointment.start, locale)}
        <span className="block text-[13px] font-normal text-[var(--fg-2)]">
          até {formatTime(appointment.end, locale)}
        </span>
      </td>

      {/* `th` de linha, não `td`: o nome do paciente é o cabeçalho daquela linha,
          e é assim que um leitor de tela consegue anunciar "Ana Moreira, Situação,
          Confirmado" ao navegar célula por célula. */}
      <th scope="row" className="px-5 py-4 text-left align-top font-normal">
        <a
          href={`/agenda/${appointment.id}`}
          className="font-semibold text-action underline-offset-2 hover:underline"
          onClick={(event) => {
            event.preventDefault();
            onOpen();
          }}
        >
          {appointment.patient.name}
        </a>
        {hasConflict && (
          <span className="mt-0.5 block text-[13px] font-semibold text-danger-fg">
            Conflito de horário
          </span>
        )}
      </th>

      <td className="px-5 py-4 align-top">
        {appointment.procedure}
        {appointment.room && (
          <span className="block text-[13px] text-[var(--fg-2)]">{appointment.room}</span>
        )}
      </td>

      <td className="px-5 py-4 align-top">
        {appointment.insurance ? (
          <>
            {appointment.insurance.name}
            {!appointment.insurance.authorized && (
              <span className="block text-[13px] font-semibold text-pending-fg">
                sem autorização
              </span>
            )}
          </>
        ) : (
          <span className="text-[var(--fg-2)]">Particular</span>
        )}
      </td>

      <td className="px-5 py-4 align-top">
        <AppointmentStatusChip status={appointment.status} />
      </td>
    </tr>
  );
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  agenda?: AgendaData | null,
) {
  return (
    <AppShell
      context={context}
      title="Agenda"
      subtitle={
        agenda
          ? `${formatDate(agenda.date, context.locale)} · ${agenda.professional.name} · ${agenda.unit.name}`
          : undefined
      }
    >
      {children}
    </AppShell>
  );
}
