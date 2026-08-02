import { useId, useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type { AgendaData, Appointment } from "../contracts/index.js";
import { formatDate, formatDateTime, formatTime } from "../contracts/index.js";
import { canCancel, canMarkNoShow, wouldConflict } from "../rules/agenda.js";
import { AppShell } from "../components/AppShell.js";
import {
  AppointmentStatusChip,
  Button,
  Card,
  CardHeader,
  DetailList,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";

/**
 * Detalhe do atendimento: onde as quatro regras da agenda ficam visíveis.
 *
 * Nenhuma ação desaparece por estar bloqueada. Cancelar sem permissão, registrar
 * ausência antes da tolerância e reagendar para um horário ocupado aparecem como
 * ação desabilitada com o motivo — que é o que transforma a regra em algo que a
 * recepção aprende usando, e a engenharia recebe escrito.
 */
export function AppointmentDetail({ params, context }: ScreenProps) {
  const { data, isLoading, error, permissions, locale } = context;

  const cancelReasonId = useId();
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [outcome, setOutcome] = useState<string | undefined>();
  const [localStatus, setLocalStatus] = useState<Appointment["status"] | undefined>();
  const [rescheduleTo, setRescheduleTo] = useState("");

  if (isLoading) return wrap(context, <LoadingState label="Carregando o atendimento" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const agenda = data as AgendaData | null;
  const appointments = agenda?.appointments ?? [];
  const appointment = appointments.find((item) => item.id === params.id);

  if (!appointment) {
    return wrap(
      context,
      <EmptyState
        title="Atendimento não encontrado"
        description={`Nenhum atendimento com o identificador ${params.id ?? "informado"} nesta agenda.`}
      />,
    );
  }

  const status = localStatus ?? appointment.status;
  const effective: Appointment = { ...appointment, status };

  const cancellation = canCancel(effective, permissions);
  const noShow = canMarkNoShow(effective, permissions, agenda!.now);
  // `schedules.edit` e `schedules.cancel` têm a mesma lista de papéis no
  // monólito, mas são permissões separadas — e a tela pergunta por cada uma,
  // porque a lista pode divergir sem aviso.
  const canReschedule = permissions.includes("schedules.edit");
  const conflicts = (appointment.conflictsWith ?? [])
    .map((id) => appointments.find((item) => item.id === id))
    .filter((item): item is Appointment => Boolean(item));

  // O horário digitado é validado contra a regra na hora, não no submit: o ponto
  // do reagendamento com conflito é a recepção descobrir a colisão antes de
  // prometer o horário ao paciente no telefone.
  const target = rescheduleTo
    ? {
        start: `${agenda!.date}T${rescheduleTo}:00.000-03:00`,
        end: `${agenda!.date}T${addMinutes(rescheduleTo, durationMinutes(appointment))}:00.000-03:00`,
      }
    : undefined;
  const rescheduleConflicts = target ? wouldConflict(appointment, target, appointments) : false;

  return wrap(
    context,
    <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <div className="space-y-4">
        {conflicts.length > 0 && (
          <Notice tone="danger" title="Este horário está em conflito">
            <p className="m-0">
              {conflicts
                .map((item) => `${formatTime(item.start, locale)} — ${item.patient.name}`)
                .join("; ")}{" "}
              ocupa o mesmo intervalo da mesma profissional.
            </p>
            <p className="m-0 mt-1.5">
              Reagende um dos dois. Confirmar a sobreposição é bloqueado pela regra{" "}
              <code>no-double-booking</code>.
            </p>
          </Notice>
        )}

        {status === "cancelled" && appointment.cancellation && (
          <Notice tone="danger" title="Atendimento cancelado">
            <p className="m-0">{appointment.cancellation.reason}</p>
            <p className="m-0 mt-1.5 text-[13px]">
              Por {appointment.cancellation.by} em{" "}
              {formatDateTime(appointment.cancellation.at, locale)}.
            </p>
          </Notice>
        )}

        {status === "no_show" && (
          <Notice tone="pending" title="Paciente registrado como ausente">
            A ausência foi registrada depois da tolerância de 15 minutos. Reverter exige abrir um
            novo agendamento.
          </Notice>
        )}

        <Card as="section">
          <CardHeader title="Atendimento" />
          <div className="px-5 py-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="m-0 text-xl font-bold text-navy">{appointment.patient.name}</h3>
              <AppointmentStatusChip status={status} />
            </div>

            <DetailList
              items={[
                {
                  label: "Horário",
                  value: `${formatTime(appointment.start, locale)} às ${formatTime(appointment.end, locale)} · ${formatDate(agenda!.date, locale)}`,
                },
                { label: "Procedimento", value: appointment.procedure },
                { label: "Profissional", value: appointment.professional.name },
                { label: "Local", value: appointment.room ?? "A definir" },
                {
                  label: "Convênio",
                  value: appointment.insurance ? (
                    <>
                      {appointment.insurance.name}
                      {!appointment.insurance.authorized && (
                        <span className="ml-2 text-[14px] font-semibold text-pending-fg">
                          sem autorização
                        </span>
                      )}
                    </>
                  ) : (
                    "Particular"
                  ),
                },
                {
                  label: "Paciente",
                  value: (
                    <a
                      href={`/patients/${appointment.patient.id}`}
                      className="text-action underline-offset-2 hover:underline"
                      onClick={(event) => {
                        event.preventDefault();
                        context.navigate(`/patients/${appointment.patient.id}`);
                      }}
                    >
                      Abrir cadastro
                    </a>
                  ),
                },
              ]}
            />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card as="section">
          <CardHeader title="Ações" hint={`Relógio da situação: ${formatTime(agenda!.now, locale)}`} />
          <div className="px-5 py-5">
            {/* Região de status: o resultado de cancelar ou registrar ausência
                precisa ser anunciado, não apenas exibido. É o que os cenários
                declaram em `announces`. */}
            <p role="status" aria-live="polite" className="m-0 min-h-6 text-[15px] text-navy">
              {outcome}
            </p>

            <div className="mt-3 flex flex-col items-start gap-3">
              <Button
                id="cancelar"
                variant="danger"
                unavailableReason={cancellation.allowed ? undefined : cancellation.reason}
                onClick={() => setCancelling(true)}
              >
                Cancelar atendimento
              </Button>

              <Button
                id="ausencia"
                unavailableReason={noShow.allowed ? undefined : noShow.reason}
                onClick={() => {
                  setLocalStatus("no_show");
                  setOutcome("Ausência registrada.");
                }}
              >
                Registrar ausência
              </Button>

              <Button variant="ghost" onClick={() => context.navigate("/agenda")}>
                Voltar para a agenda
              </Button>
            </div>

            {cancelling && (
              <form
                className="mt-5 rounded-card border border-[var(--border-strong)] bg-ink-50 px-4 py-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setLocalStatus("cancelled");
                  setCancelling(false);
                  setOutcome("Atendimento cancelado. A justificativa foi registrada.");
                }}
              >
                <label htmlFor={cancelReasonId} className="block text-[14px] font-semibold text-navy">
                  Justificativa do cancelamento
                </label>
                <p className="m-0 mt-0.5 text-[13px] text-[var(--fg-2)]">
                  Obrigatória pela regra <code>cancel-requires-reason</code>.
                </p>
                <textarea
                  id={cancelReasonId}
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  className="mt-2 w-full rounded-field border border-[var(--border-strong)] bg-surface px-3 py-2 text-[15px] text-navy placeholder:text-[var(--fg-3)]"
                  placeholder="Ex.: paciente remarcou por conflito de trabalho"
                />
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <Button
                    type="submit"
                    variant="primary"
                    unavailableReason={
                      cancelReason.trim().length === 0
                        ? "Escreva a justificativa para confirmar."
                        : undefined
                    }
                  >
                    Confirmar cancelamento
                  </Button>
                  <Button variant="ghost" onClick={() => setCancelling(false)}>
                    Voltar
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>

        <Card as="section">
          <CardHeader title="Reagendar" hint="Verificação de conflito na hora da escolha" />
          <div className="px-5 py-5">
            <label htmlFor="novo-horario" className="block text-[14px] font-semibold text-navy">
              Novo horário
            </label>
            {/* O campo segue a permissão junto com o botão. Deixar o horário
                editável e só barrar no envio faria a pessoa escolher, verificar
                conflito e descobrir a negativa depois — trabalho jogado fora, e
                a impressão de que remarcar seria possível. */}
            <input
              id="novo-horario"
              type="time"
              step={300}
              value={rescheduleTo}
              disabled={!canReschedule}
              onChange={(event) => setRescheduleTo(event.target.value)}
              aria-describedby="novo-horario-aviso"
              className="mt-2 rounded-field border border-[var(--border-strong)] bg-surface px-3 py-2 text-[15px] text-navy disabled:cursor-not-allowed disabled:opacity-55"
            />

            <p id="novo-horario-aviso" role="status" aria-live="polite" className="m-0 mt-2 min-h-5 text-[13px]">
              {/* Sem permissão, esta região fica calada: o motivo já está no
                  botão por `unavailableReason`, e repeti-lo numa região viva
                  faria o leitor de tela anunciar a mesma negativa duas vezes ao
                  abrir a página. */}
              {!canReschedule ? null : rescheduleTo === "" ? (
                <span className="text-[var(--fg-2)]">
                  Duração mantida: {durationMinutes(appointment)} minutos.
                </span>
              ) : rescheduleConflicts ? (
                <span className="font-semibold text-danger-fg">
                  {rescheduleTo} colide com outro atendimento da mesma profissional.
                </span>
              ) : (
                <span className="font-semibold text-ok-fg">{rescheduleTo} está livre.</span>
              )}
            </p>

            <div className="mt-3">
              <Button
                id="reagendar"
                variant="primary"
                unavailableReason={
                  !canReschedule
                    ? "Seu perfil não reagenda atendimentos. Peça à recepção ou à coordenação."
                    : rescheduleTo === ""
                      ? "Escolha um horário."
                      : rescheduleConflicts
                        ? "Escolha um horário sem conflito."
                        : undefined
                }
                onClick={() => setOutcome(`Atendimento reagendado para ${rescheduleTo}.`)}
              >
                Confirmar reagendamento
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>,
    appointment,
  );
}

function durationMinutes(appointment: Appointment): number {
  return Math.round((Date.parse(appointment.end) - Date.parse(appointment.start)) / 60_000);
}

function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours! * 60 + mins! + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  appointment?: Appointment,
) {
  return (
    <AppShell
      context={context}
      title={appointment ? appointment.patient.name : "Atendimento"}
      subtitle={appointment?.procedure}
      breadcrumb={[{ label: "Agenda", path: "/agenda" }, { label: "Atendimento" }]}
    >
      {children}
    </AppShell>
  );
}
