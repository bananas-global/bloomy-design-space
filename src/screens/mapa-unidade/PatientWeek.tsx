/**
 * `unit_map_live/components/patient_week.ex` → `PatientWeek`, com o
 * `EditIncompleteScheduleModal` (`components/edit_incomplete_schedule_modal.ex`).
 *
 * O `PropagateScheduleModal`, que o original abre depois de Confirmar quando há
 * outros agendamentos do mapa de horas para propagar, não está aqui.
 */
import { useEffect, useState } from "react";
import { Button } from "../../components/Button.js";
import { SimpleForm } from "../../components/Feedback.js";
import { Icon } from "../../components/Icon.js";
import { Input, InputSwitchCard } from "../../components/Input.js";
import { Avatar } from "../../components/Layout.js";
import { Modal } from "../../components/Overlay.js";
import type { Schedule, UnitMapData } from "./fixtures.js";
import { WEEK_FILTER_ROW, field, useFilterForm } from "./flow.js";
import {
  LONG_WEEKDAYS,
  SPECIALTY_NAMES,
  dayOfWeek,
  fetchPatientsWithSchedules,
  hasPreference,
  pad,
  patientOptions,
  professionalOptions,
  serviceDates,
  serviceOptions,
  unitHours,
  type PatientScheduleItem,
} from "./model.js";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

const PREFERENCE_COLOR = "#fbbf24";

export function PatientWeek({
  data,
  dates,
  canManage,
  editScheduleId,
  onUpdate,
  onCloseEdit,
}: {
  data: UnitMapData;
  dates: string[];
  canManage: boolean;
  editScheduleId?: string;
  /** O `send_update(PatientWeek, action: :schedule_updated)` com o flash do modal. */
  onUpdate: (schedule: Schedule, professionalId: string) => void;
  onCloseEdit: () => void;
}) {
  const [form, set] = useFilterForm({
    patient_ids: [] as string[],
    service_ids: [] as string[],
    professional_ids: [] as string[],
    show_tbd: true,
    show_reserved: true,
  });
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  useEffect(() => {
    if (editScheduleId) setEditSchedule(data.schedules.find((s) => s.id === editScheduleId) ?? null);
  }, [editScheduleId]);
  const hours = unitHours(data);
  const filteredDates = serviceDates(data, dates);
  const patients = fetchPatientsWithSchedules(data, dates, {
    patientIds: form.patient_ids,
    serviceIds: form.service_ids,
    professionalIds: form.professional_ids,
    showTbd: form.show_tbd,
    showReserved: form.show_reserved,
  });

  const edit = (item: PatientScheduleItem) => {
    if (item.editable && canManage) setEditSchedule(data.schedules.find((s) => s.id === item.id) ?? null);
  };

  return (
    <div>
      {editSchedule && (
        <EditIncompleteScheduleModal
          data={data}
          schedule={editSchedule}
          onCancel={() => {
            setEditSchedule(null);
            onCloseEdit();
          }}
          onSave={(professionalId) => {
            onUpdate(editSchedule, professionalId);
            setEditSchedule(null);
            onCloseEdit();
          }}
        />
      )}

      <form onSubmit={(event) => event.preventDefault()}>
        <div className={WEEK_FILTER_ROW}>
          <Input
            type="multi_select_search"
            field={field("patient_ids", form.patient_ids)}
            label="Pacientes"
            prompt="Todos"
            options={patientOptions(data)}
            className="flex-1 min-w-[200px]"
            onChange={(ids) => set("patient_ids", ids)}
          />

          <Input
            type="multi_select_search"
            field={field("service_ids", form.service_ids)}
            label="Especialidades"
            prompt="Todos"
            options={serviceOptions(data)}
            className="flex-1 min-w-[200px]"
            onChange={(ids) => set("service_ids", ids)}
          />

          <Input
            type="multi_select_search"
            field={field("professional_ids", form.professional_ids)}
            label="Profissional"
            prompt="Todos"
            options={professionalOptions(data, form.service_ids)}
            className="flex-1 min-w-[200px]"
            onChange={(ids) => set("professional_ids", ids)}
          />

          <InputSwitchCard className="mt-auto" label="TBD" active={field("show_tbd", form.show_tbd)}>
            <Input type="switch" field={field("show_tbd", form.show_tbd)} onChange={(event) => set("show_tbd", event.target.checked)} />
          </InputSwitchCard>

          <InputSwitchCard className="mt-auto" label="Mostrar reservados?" active={field("show_reserved", form.show_reserved)}>
            <Input
              type="switch"
              field={field("show_reserved", form.show_reserved)}
              onChange={(event) => set("show_reserved", event.target.checked)}
            />
          </InputSwitchCard>
        </div>
      </form>

      {patients.map((patient) => (
        <div key={patient.id} className="mb-8">
          {/* Bordas só à direita e embaixo de cada célula (a de fora é do contêiner); a barra de rolagem só aparece quando a tabela não cabe. */}
          {/* Mesmo layout da grade semanal do profissional (`ProfessionalWeek`), sem as taxas de ocupação. */}
          <div className="w-full overflow-x-auto rounded-lg border border-brand-purple-dark/10 bg-white">
            <table
              className={cx(
                "table-fixed border-separate border-spacing-0 w-full",
                "[&_td]:border-b [&_td]:border-r [&_td]:border-brand-purple-dark/10",
                "[&_tr>td:last-child]:border-r-0 [&_tbody>tr:last-child>td]:border-b-0",
              )}
              style={{ minWidth: 256 + hours.length * 128 }}
            >
              <thead>
                <tr>
                  <td className="w-64 sticky left-0 z-10 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <Avatar size="custom" className="w-10 h-10 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="font-bold text-brand-purple-dark text-sm whitespace-nowrap text-ellipsis overflow-hidden">{patient.name}</p>
                      </div>
                    </div>
                  </td>

                  {hours.map((hour) => (
                    <td key={hour} className="w-32 min-w-[8rem] text-center px-1 py-2 bg-white">
                      <p className="text-sm font-bold text-brand-purple-dark/80">{pad(hour)}</p>
                    </td>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredDates.map((date, row) => {
                  const pref = (r: number, h: number) =>
                    r >= 0 && r < filteredDates.length && hours.includes(h) && hasPreference(patient.agendas, filteredDates[r]!, h);
                  return (
                    <tr key={date}>
                      <td className="sticky left-0 z-10 bg-white px-4 py-3">
                        <p className="font-bold text-brand-purple-dark text-sm">{LONG_WEEKDAYS[dayOfWeek(date) - 1]}</p>
                      </td>
                      {hours.map((hour) => (
                        <ScheduleCell
                          key={hour}
                          schedule={patient.schedules.find((s) => s.date === date && s.hour === hour)}
                          preference={
                            pref(row, hour)
                              ? { top: !pref(row - 1, hour), right: !pref(row, hour + 1), bottom: !pref(row + 1, hour), left: !pref(row, hour - 1) }
                              : null
                          }
                          canManage={canManage}
                          onEdit={edit}
                        />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {patients.length === 0 && <p className="text-center py-8 text-neutral-600">Nenhum paciente encontrado</p>}
    </div>
  );
}

type PreferenceEdges = { top: boolean; right: boolean; bottom: boolean; left: boolean };

/**
 * O tracejado amarelo da preferência da família (o `border: 2px dashed #fbbf24`
 * do original), desenhado só nas bordas de fora do bloco de preferência, para
 * não dobrar a linha entre duas células vizinhas.
 */
function PreferenceOutline({ edges }: { edges: PreferenceEdges }) {
  const w = (on: boolean) => (on ? 2 : 0);
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        borderStyle: "dashed",
        borderColor: PREFERENCE_COLOR,
        borderWidth: `${w(edges.top)}px ${w(edges.right)}px ${w(edges.bottom)}px ${w(edges.left)}px`,
      }}
    ></span>
  );
}

function ScheduleCell({
  schedule,
  preference,
  canManage,
  onEdit,
}: {
  schedule: PatientScheduleItem | undefined;
  preference: PreferenceEdges | null;
  canManage: boolean;
  onEdit: (item: PatientScheduleItem) => void;
}) {
  if (schedule?.reserved) {
    return (
      <td className="p-1 h-[72px]">
        <div className="h-full border border-stone-300 rounded bg-stone-50 px-1 py-0.5 flex flex-col items-center justify-center">
          <p className="text-[10px] font-bold wrap-break-word w-full text-stone-500 text-center">{schedule.professionalName}</p>
          <p className="text-[10px] wrap-break-word w-full text-stone-400 text-center">{schedule.serviceName}</p>
          <p className="text-[10px] font-bold text-stone-500 text-center">Reserva</p>
        </div>
      </td>
    );
  }

  if (!schedule && preference) {
    return (
      <td className="relative p-1 h-[72px]">
        <PreferenceOutline edges={preference} />
        <div className="h-full flex items-center justify-center">
          <Icon type="solid" name="fa-star" className="text-yellow-500 text-lg" />
        </div>
      </td>
    );
  }

  if (!schedule) return <td className="p-1 h-[72px]"></td>;

  return (
    <td
      className={cx(
        "relative p-1 h-[72px]",
        schedule.status === "incomplete" && "bg-brand-purple-dark/10",
        schedule.status !== "incomplete" && "bg-warning/20",
        schedule.editable && "cursor-pointer hover:bg-warning/30",
      )}
      onClick={schedule.editable && canManage ? () => onEdit(schedule) : undefined}
    >
      {preference && <PreferenceOutline edges={preference} />}
      <p className="text-xs font-bold wrap-break-word w-full text-yellow-800 text-center">{schedule.professionalName}</p>
      <p className="text-xs wrap-break-word w-full text-yellow-800 text-center">{schedule.serviceName}</p>
    </td>
  );
}

/** `ProfessionalAllocator.create_options/1`: "[N%] Nome" em três grupos. */
function allocatorOptions(data: UnitMapData, schedule: Schedule) {
  const specialty = data.services.find((s) => s.id === schedule.serviceId)?.specialty;
  const busy = (id: string) =>
    data.schedules.some((s) => s.professionalId === id && s.weekday === schedule.weekday && s.hour === schedule.hour);
  const candidates = data.professionals.filter((p) => p.active && p.specialty === specialty);
  const inAgenda = (id: string) =>
    candidates.find((p) => p.id === id)!.agenda.some((a) => a.weekday === schedule.weekday && a.start <= schedule.hour && schedule.hour < a.end);
  const option = (percentage: number) => (p: { id: string; name: string }) => ({ label: `[${percentage}%] ${p.name}`, value: p.id });
  return [
    { group: "Disponíveis", items: candidates.filter((p) => inAgenda(p.id) && !busy(p.id)).map(option(100)) },
    { group: "Parcialmente", color: "orange", items: [] },
    { group: "Não disponíveis", color: "red", items: candidates.filter((p) => !inAgenda(p.id) || busy(p.id)).map(option(0)) },
  ];
}

function EditIncompleteScheduleModal({
  data,
  schedule,
  onCancel,
  onSave,
}: {
  data: UnitMapData;
  schedule: Schedule;
  onCancel: () => void;
  onSave: (professionalId: string) => void;
}) {
  const [professionalId, setProfessionalId] = useState<string | null>(schedule.professionalId);
  const service = data.services.find((s) => s.id === schedule.serviceId);
  const specialtyOptions = Object.entries(SPECIALTY_NAMES).map(([value, label]) => [label, value] as const);
  const professionalOptions = allocatorOptions(data, schedule);

  return (
    <div>
      <Modal id="edit_incomplete_schedule_modal" show title="Editar Agendamento Incompleto" onCancel={onCancel}>
        <SimpleForm
          onSubmit={(event) => {
            event.preventDefault();
            if (professionalId) onSave(professionalId);
          }}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <Input
              type="select"
              label="Especialidade"
              field={field("specialty_id", service?.specialty, "schedule")}
              prompt="Selecionar"
              options={specialtyOptions}
              disabled
            />

            <Input
              type="select_search"
              id="incomplete_service_id"
              label="Serviço"
              options={service ? [{ label: service.name, value: service.id }] : []}
              field={field("service_id", service?.id, "schedule")}
              disabled
            />

            <Input
              type="select_search"
              id="incomplete_professional_id"
              label="Profissional"
              options={professionalOptions}
              field={field("professional_id", professionalId, "schedule")}
              prompt={service ? "Selecione um profissional" : "Selecione o serviço"}
              onChange={(value) => setProfessionalId(value)}
            />

            <Input
              label="Local"
              field={field("session_location", "in_clinic", "schedule")}
              type="select"
              options={[
                ["Na Clínica", "in_clinic"],
                ["Escola", "school"],
                ["Domicílio", "home"],
              ]}
              prompt="Selecione o local"
              disabled
            />
          </div>

          <div className="flex gap-4 justify-between mt-6">
            <div className="flex gap-4 items-center">
              <Button variant="tint" rightIcon="fa-times" onClick={onCancel} type="button">
                Fechar
              </Button>
            </div>

            <Button rightIcon="fa-check">Confirmar</Button>
          </div>
        </SimpleForm>
      </Modal>
    </div>
  );
}
