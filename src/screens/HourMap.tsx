import type { ScreenProps } from "@brucesantos/design-space";
import type { HourMapData, HourMapSlot } from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { PatientPageFrame } from "../components/PatientPageFrame.js";
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
  canApply,
  canEdit,
  daysToExpiry,
  expiryMessage,
  expiryState,
  conflictMessage,
  losesProfessional,
  losesRoom,
  mapSummary,
  weekdayLabel,
  weeklyMinutes,
} from "../rules/hourMap.js";

/**
 * Mapa de horas.
 *
 * A ponte entre o plano e a agenda: alguém desenha a semana pretendida do
 * paciente e o sistema materializa isso em agendamentos ao longo da vigência.
 *
 * O que torna a tela difícil é o que o sistema faz quando não consegue: em vez
 * de falhar, ele **apaga o campo em conflito e cria o horário assim mesmo**. Um
 * mapa aplicado com quinze agendamentos sem profissional parece pronto e não
 * está.
 *
 * Duas decisões seguem daí:
 *
 * 1. **O resumo vem antes da grade.** Quem aplica precisa saber quantos
 *    horários vão nascer incompletos, e não descobrir horário a horário.
 *
 * 2. **Cada conflito diz de quem é resolver.** Profissional é da coordenação,
 *    sala é da administração da unidade, e agenda padrão faltando é do People.
 *    Um aviso único de "conflito" não diz a quem entregar.
 */
export function HourMapScreen({ context }: ScreenProps) {
  const { data, isLoading, error, locale, permissions } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando o mapa" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const mapData = data as HourMapData | null;
  if (!mapData) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const { map } = mapData;
  const summary = mapSummary(map);
  const apply = canApply(map, permissions);
  const edit = canEdit(map, permissions);
  const minutes = weeklyMinutes(map);

  if (map.slots.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum horário desenhado"
        description="O mapa é a semana pretendida do paciente: dia, horário, especialidade e, quando dá, profissional e sala. Desenhe ao menos um horário para poder aplicar."
      />,
      mapData,
    );
  }

  return wrap(
    context,
    <div className="space-y-4">
      {/* --------------------------------------- o resumo, antes da grade */}
      {summary.complete < summary.total && (
        <Notice
          tone={map.status === "applied" ? "danger" : "warn"}
          title={`${summary.total - summary.complete} de ${summary.total} horários ${map.status === "applied" ? "nasceram" : "vão nascer"} incompletos`}
        >
          <p className="m-0">
            Quando um horário esbarra num conflito, o sistema apaga o campo em conflito e cria o
            agendamento assim mesmo. É defensável — metade de um horário é melhor que nenhum —, e
            precisa estar visível: um mapa aplicado com buracos parece pronto.
          </p>
          <ul className="m-0 mt-2 list-disc space-y-0.5 pl-5">
            {summary.withoutProfessional > 0 && (
              <li>
                {summary.withoutProfessional} sem profissional definido — resolver é da coordenação
                e do People.
              </li>
            )}
            {summary.withoutRoom > 0 && (
              <li>
                {summary.withoutRoom} sem sala definida — resolver é da administração da unidade.
              </li>
            )}
          </ul>
        </Notice>
      )}

      {/* O vencimento vem antes da grade: um mapa que termina sem sucessor é
          intervenção que para, e isso decide o que fazer com a tela toda.
          A frase existe para todos os estados menos o seguro — ausência de
          etiqueta não é sinal, porque ninguém repara no que não está lá. */}
      {(() => {
        const estado = expiryState(map, mapData.now, mapData.hasSuccessor);
        const frase = expiryMessage(estado, daysToExpiry(map, mapData.now));
        if (!frase) return null;
        return (
          <Notice
            tone={estado === "expiring-without-successor" || estado === "over" ? "danger" : "info"}
            title={
              estado === "expiring-without-successor"
                ? "A semana do paciente deixa de existir"
                : estado === "over"
                  ? "Sem semana pretendida em vigor"
                  : "Vencimento do mapa"
            }
          >
            {frase}
          </Notice>
        );
      })()}

      {map.warnings.length > 0 && (
        <Notice tone="info" title="Avisos gerados na aplicação">
          <ul className="m-0 list-disc space-y-0.5 pl-5">
            {map.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Notice>
      )}

      {/* -------------------------------------------------------- cabeçalho */}
      <Card as="section">
        <CardHeader
          title={`Semana pretendida · ${map.patient.name}`}
          hint={`Unidade ${map.unitName}`}
        />
        <div className="space-y-3 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Chip
              tone={
                map.status === "applied" ? "ok" : map.status === "cancelled" ? "neutral" : "info"
              }
            >
              {map.status === "applied"
                ? "Aplicado"
                : map.status === "cancelled"
                  ? "Cancelado"
                  : "Em desenho"}
            </Chip>
            {map.autoRenew && <Chip tone="info">Renova sozinho</Chip>}
          </div>

          <p className="m-0 text-[0.9375rem] text-navy">
            {Math.floor(minutes / 60)} horas por semana, de{" "}
            {formatDate(`${map.durationStart}T12:00:00.000-03:00`, locale)} a{" "}
            {formatDate(`${map.durationEnd}T12:00:00.000-03:00`, locale)}.
          </p>

          <p className="m-0 max-w-[72ch] text-[0.8125rem] text-[var(--fg-2)]">
            As horas por semana contam o que foi desenhado, e não o que sobrou depois dos conflitos:
            é o número que a coordenação combinou com a família, e ele não muda porque uma sala
            estava ocupada.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              id="aplicar"
              variant="primary"
              unavailableReason={apply.allowed ? undefined : apply.reason}
            >
              Aplicar o mapa
            </Button>
            <Button id="editar" unavailableReason={edit.allowed ? undefined : edit.reason}>
              Editar o desenho
            </Button>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------ grade */}
      <Card as="section">
        <CardHeader
          title="Grade"
          hint={`${summary.complete} de ${summary.total} horários completos`}
        />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-3 p-0">
            {[...map.slots]
              .sort((a, b) =>
                a.weekday === b.weekday
                  ? a.startAt.localeCompare(b.startAt)
                  : a.weekday - b.weekday,
              )
              .map((slot) => (
                <SlotRow key={slot.id} slot={slot} />
              ))}
          </ul>
        </div>
      </Card>
    </div>,
    mapData,
  );
}

function SlotRow({ slot }: { slot: HourMapSlot }) {
  const noProfessional = losesProfessional(slot);
  const noRoom = losesRoom(slot);
  const incomplete = slot.conflicts.length > 0;

  return (
    <li
      className={`rounded-field border px-4 py-3 ${
        incomplete ? "border-warn-fg/35 bg-warn-bg" : "border-[var(--border-soft)]"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">
          {weekdayLabel(slot.weekday)}, {slot.startAt} às {slot.endAt}
        </span>
        <span className="text-[0.875rem] text-navy">{slot.serviceName}</span>
        {slot.scheduleType === "at" && <Chip tone="info">Acompanhamento terapêutico</Chip>}
        {slot.sessionLocation !== "in_clinic" && (
          <Chip tone="neutral">
            {slot.sessionLocation === "school" ? "Na escola" : "Em casa"}
          </Chip>
        )}
      </div>

      <p className="m-0 mt-1 text-[0.875rem] text-navy">
        {slot.professionalName ?? (
          <span className="font-semibold text-warn-fg">sem profissional definido</span>
        )}
        {" · "}
        {slot.roomName ??
          (slot.sessionLocation === "in_clinic" ? (
            <span className="font-semibold text-warn-fg">sem sala definida</span>
          ) : (
            <span className="text-[var(--fg-2)]">sala não se aplica fora da clínica</span>
          ))}
      </p>

      {incomplete && (
        <ul className="m-0 mt-2 list-none space-y-1 p-0">
          {slot.conflicts.map((conflict) => {
            const message = conflictMessage(conflict);
            return (
              <li key={conflict} className="text-[0.8125rem] text-navy">
                <span className="font-semibold">{message.what}</span>{" "}
                <span className="text-[var(--fg-2)]">Resolver: {message.owner}.</span>
              </li>
            );
          })}
        </ul>
      )}

      {noProfessional && noRoom && (
        <p className="m-0 mt-1.5 text-[0.8125rem] font-semibold text-navy">
          Este horário perdeu profissional e sala, e mesmo assim vai virar agendamento.
        </p>
      )}
    </li>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode, mapData?: HourMapData) {
  return (
    <AppShell
      context={context}
      title="Mapa de horas"
      subtitle={mapData?.map.patient.name}
      breadcrumb={[{ label: "Pacientes", path: "/patients" }, { label: "Mapa de horas" }]}
      showPageHeading={false}
    >
      {mapData ? <PatientPageFrame patientName={mapData.map.patient.name} active="Mapa de Horas" secondary={["Padrão de Agenda","Disponibilidade do Paciente"]}>{children}</PatientPageFrame> : children}
    </AppShell>
  );
}
