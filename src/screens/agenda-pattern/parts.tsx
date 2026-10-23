/**
 * Padrão de Agenda — as peças da aba, espelhando
 * `PatientLive.Components.HourMap.Agenda` (`specialty_items/1`,
 * `agenda_cell/1`, `specialty_grid_card/1`, `combined_specialty_grid_card/1`)
 * e o `HourMap.AgendaModal`. Cores e ícones vêm de `specialty_card_colors/1` e
 * `specialty_icon/1` (`SchedulingLive.Components.Common`).
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { RadioSelector } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { Input, type SelectOption } from "../../components/Input.js";
import { Avatar } from "../../components/Layout.js";
import { Modal } from "../../components/Overlay.js";
import { PROFESSIONALS, ROOMS, SERVICES, SPECIALTIES, type AgendaItem, type ScheduleType, type SpecialtySlug } from "./fixtures.js";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export const WEEKDAYS = [1, 2, 3, 4, 5];
export const WEEKDAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
/** `abbreviated_day_of_week_names/1`. */
const WEEKDAY_ABBR = ["SEG", "TER", "QUA", "QUI", "SEX"];
/** `@service_hour` da unidade: das 08:00 às 18:00. */
export const START_HOUR = 8;
export const END_HOUR = 18;
export const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

/** `format_hour/1`. */
export const formatHour = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/** `specialty_icon/1`. */
export const SPECIALTY_ICON: Record<SpecialtySlug, string> = {
  phonoaudiology: "fa-face-surprise",
  psychology: "fa-head-side-brain",
  occupational_therapy: "fa-hands-holding-diamond",
  physiotherapy: "fa-user",
  music_therapy: "fa-music",
};

/** `specialty_card_colors/1`. */
export const SPECIALTY_COLORS: Record<SpecialtySlug, string> = {
  phonoaudiology: "bg-brand-blue/10 border-brand-blue/40 text-brand-blue-dark",
  psychology: "bg-brand-green/10 border-brand-green/40 text-brand-green-dark",
  occupational_therapy: "bg-brand-purple/10 border-brand-purple/40 text-brand-purple",
  physiotherapy: "bg-brand-orange/10 border-brand-orange/40 text-brand-orange-dark",
  music_therapy: "bg-pink/10 border-pink/40 text-pink-dark",
};

export const specialtyName = (slug: SpecialtySlug) => SPECIALTIES.find((s) => s.slug === slug)?.name ?? slug;

/** `schedule_type_label/1`. */
const scheduleTypeLabel = (type: ScheduleType) => (type === "at" ? "AT" : "Paciente");

/** `specialty_items/1` + `specialty_count_card/1`: as horas semanais por especialidade. */
export function SpecialtyItems({ items }: { items: AgendaItem[] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {SPECIALTIES.map((specialty) => (
        <div key={specialty.slug} className="rounded-xl p-4 flex items-center flex-1 gap-4 text-brand-blue-dark border border-brand-blue/40">
          <div className="rounded w-7 h-7 flex items-center justify-center bg-brand-blue/10">
            <Icon type="solid" name={SPECIALTY_ICON[specialty.slug]} className="text-xs" />
          </div>
          <div>
            <p className="font-extrabold text-sm/4">{specialty.name}</p>
            <p className="text-xs">{items.filter((item) => item.specialty === specialty.slug).length} horas semanais</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** `specialty_card/1` com `status={:scheduled}`. */
function SpecialtyIcon({ slug }: { slug: SpecialtySlug }) {
  return (
    <div className="shrink-0 w-7 h-7 flex items-center justify-center rounded bg-brand-blue/20">
      <Icon name={SPECIALTY_ICON[slug]} />
    </div>
  );
}

function TypeBadge({ type, small }: { type: ScheduleType; small?: boolean }) {
  return (
    <span
      className={cx(
        "shrink-0 rounded font-semibold uppercase whitespace-nowrap",
        small ? "px-1 py-0.5 text-[9px]" : "ml-auto px-1.5 py-0.5 text-[10px]",
        type === "at" ? "bg-brand-accent/20 text-brand-accent" : "bg-brand-purple-dark/10 text-brand-purple-dark",
      )}
    >
      {scheduleTypeLabel(type)}
    </span>
  );
}

/** `specialty_grid_card/1`: um item sozinho na célula. */
function SpecialtyGridCard({ item, onClick }: { item: AgendaItem; onClick: () => void }) {
  return (
    <div
      data-id={item.id}
      onClick={onClick}
      className={cx("item relative min-w-0 rounded-xl select-none border p-1.5 space-y-2 hover:cursor-pointer", SPECIALTY_COLORS[item.specialty])}
    >
      <div className="flex min-w-0 items-center gap-2">
        <SpecialtyIcon slug={item.specialty} />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold leading-none truncate text-sm">{specialtyName(item.specialty)}</p>
          <p className="truncate text-xs">{item.service}</p>
        </div>
        <TypeBadge type={item.scheduleType} />
      </div>

      <div className="flex gap-2 items-center relative">
        <Avatar size="custom" className="w-7 h-7" />
        <p className="font-bold truncate text-xs">{item.professional ?? "Sem profissional"}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="mr-4">
          <p className="whitespace-nowrap text-ellipsis overflow-hidden text-xs">
            <Icon type="solid" name="fa-door-open" className="mr-1" />
            {item.room ?? "Sem sala"}
          </p>
        </div>
      </div>
    </div>
  );
}

/** `combined_specialty_grid_card/1`: dois itens na mesma célula. */
function CombinedSpecialtyGridCard({ items, onClick }: { items: AgendaItem[]; onClick: (item: AgendaItem) => void }) {
  return (
    <div className="h-full min-h-0 grid grid-rows-2 gap-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onClick(item)}
          className={cx("w-full min-w-0 h-full rounded-md border px-1.5 py-1 flex items-stretch cursor-pointer", SPECIALTY_COLORS[item.specialty])}
        >
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-start gap-1.5 overflow-hidden">
              <Avatar size="custom" className="w-5 h-5 mt-0.5" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="w-full text-[10px] font-bold leading-none truncate">
                  {item.service} ({specialtyName(item.specialty)})
                </p>
                <p className="text-[10px] leading-none truncate mt-0.5">{item.professional ?? "Sem profissional"}</p>
              </div>
              <div className="flex items-start gap-1 shrink-0">
                <TypeBadge type={item.scheduleType} small />
              </div>
            </div>
            <div className="text-left mt-2">
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <p className="text-[10px] leading-none truncate min-w-0 flex-1">
                  <Icon type="solid" name="fa-door-open" className="mr-1" />
                  {item.room ?? "Sem sala"}
                </p>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/** A grade semanal: horas × dias, com `agenda_cell/1` em cada célula. */
export function AgendaGrid({
  items,
  onCreate,
  onEdit,
}: {
  items: AgendaItem[];
  onCreate: (weekday: number, hour: number) => void;
  onEdit: (item: AgendaItem) => void;
}) {
  return (
    <div className="mt-6 border-b-0 border rounded border-neutral-100">
      <table className="w-full border-collapse table-fixed">
        <thead className="border-b border-neutral-100">
          <tr>
            <th className="w-12" />
            {WEEKDAYS.map((day, i) => (
              <th key={day} className="border-l border-neutral-100 p-2 font-normal text-sm text-right">
                {WEEKDAY_ABBR[i]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour} className="h-29">
              <th className="font-normal border border-neutral-100 align-middle text-sm">{formatHour(hour)}</th>
              {WEEKDAYS.map((weekday) => {
                const slot = items.filter((item) => item.weekday === weekday && item.hour === hour);
                return (
                  <td key={weekday} className="relative border border-neutral-100 last:border-r-0 h-29" data-weekday={weekday} data-start-hour={hour} data-end-hour={hour + 1}>
                    <div className="absolute inset-0 p-1">
                      {slot.length > 1 ? (
                        <CombinedSpecialtyGridCard items={slot} onClick={onEdit} />
                      ) : slot.length === 1 ? (
                        <div className="space-y-1">
                          <SpecialtyGridCard item={slot[0]!} onClick={() => onEdit(slot[0]!)} />
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label="Adicionar agendamento"
                          className="absolute inset-0 hover:bg-blue-light/40 hover:cursor-pointer"
                          onClick={() => onCreate(weekday, hour)}
                        />
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const options = (values: string[]): SelectOption[] => values.map((value) => ({ label: value, value }));
const search = (list: SelectOption[]) => (name: string) => list.filter((option) => option.label.toLowerCase().includes(name.toLowerCase()));

const LOCATIONS: SelectOption[] = [
  { label: "Na Clínica", value: "in_clinic" },
  { label: "Escola", value: "school" },
  { label: "Domiciliar", value: "home" },
];

type Draft = Omit<AgendaItem, "id"> & { location: string };

/**
 * `HourMap.AgendaModal`: novo ou editar item do padrão. No Phoenix a
 * especialidade vem do serviço; aqui um select de especialidade filtra
 * serviços e profissionais, como no protótipo.
 */
export function AgendaItemModal({
  editing,
  slot,
  onCancel,
  onSave,
  onDelete,
}: {
  editing?: AgendaItem;
  slot?: { weekday: number; hour: number };
  onCancel: () => void;
  onSave: (item: AgendaItem) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => ({
    weekday: editing?.weekday ?? slot?.weekday ?? 1,
    hour: editing?.hour ?? slot?.hour ?? START_HOUR,
    specialty: editing?.specialty ?? "psychology",
    service: editing?.service ?? "",
    professional: editing?.professional,
    room: editing?.room,
    scheduleType: editing?.scheduleType ?? "patient",
    location: "in_clinic",
  }));
  const [error, setError] = useState<string>();
  const set = (patch: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...patch }));

  const specialtyOptions = SPECIALTIES.map((s) => ({ label: s.name, value: s.slug }));
  const serviceOptions = options(SERVICES[draft.specialty]);
  const professionalOptions = options(PROFESSIONALS[draft.specialty]);
  const roomOptions = options(ROOMS);
  const weekdayOptions = WEEKDAYS.map((day, i) => ({ label: WEEKDAY_NAMES[i]!, value: String(day) }));
  const hourOptions = HOURS.map((hour) => ({ label: `${formatHour(hour)}–${formatHour(hour + 1)}`, value: String(hour) }));

  function save() {
    if (!draft.service) return setError("Selecione o serviço.");
    if (!draft.professional) return setError("Selecione o profissional.");
    const { location, ...item } = draft;
    onSave({ ...item, room: location === "in_clinic" ? item.room : undefined, id: editing?.id ?? `a_${Date.now()}` });
  }

  return (
    <Modal id="hour_map_item_modal" show title={editing ? "Editar Agendamento" : "Novo Agendamento"} onCancel={onCancel}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6">
        <div className="col-span-2">
          <RadioSelector
            field={{ id: "agenda_schedule_type", name: "agenda[schedule_type]", value: draft.scheduleType }}
            className="flex [&>label]:flex-1 [&>label>span]:mx-auto"
            radio={[
              { value: "patient", label: "Paciente", disabled: editing != null },
              { value: "at", label: "AT", disabled: editing != null },
            ]}
            onChange={(event) => set({ scheduleType: event.target.value as ScheduleType })}
          />
        </div>

        <Input
          type="select_search"
          id="agenda_specialty"
          label="Especialidade"
          value={draft.specialty}
          options={specialtyOptions}
          callback={search(specialtyOptions)}
          onChange={(value) => value && set({ specialty: value as SpecialtySlug, service: "", professional: undefined })}
        />
        <Input
          type="select_search"
          key={`service-${draft.specialty}`}
          id="agenda_service_id"
          label="Serviço"
          prompt="Selecione um serviço"
          value={draft.service || undefined}
          options={serviceOptions}
          callback={search(serviceOptions)}
          onChange={(value) => set({ service: value ?? "" })}
        />
        <Input
          type="select_search"
          key={`professional-${draft.specialty}`}
          id="agenda_professional_id"
          label="Profissional"
          prompt="Selecione um profissional"
          className="col-span-2"
          value={draft.professional}
          options={professionalOptions}
          callback={search(professionalOptions)}
          onChange={(value) => set({ professional: value ?? undefined })}
        />
        <Input
          type="select_search"
          id="agenda_session_location"
          label="Local"
          prompt="Selecione o local"
          value={draft.location}
          options={LOCATIONS}
          callback={search(LOCATIONS)}
          onChange={(value) => set({ location: value ?? "in_clinic" })}
        />
        {draft.location === "in_clinic" && (
          <Input
            type="select_search"
            id="agenda_unit_room_id"
            label="Sala"
            prompt="Sem sala definida"
            value={draft.room}
            options={roomOptions}
            callback={search(roomOptions)}
            onChange={(value) => set({ room: value ?? undefined })}
          />
        )}
        <Input
          type="select"
          id="agenda_weekday"
          label="Dia da Semana"
          value={String(draft.weekday)}
          options={weekdayOptions}
          onChange={(value) => set({ weekday: Number(value) })}
        />
        <Input
          type="select"
          id="agenda_start_at"
          label="Horário"
          value={String(draft.hour)}
          options={hourOptions}
          onChange={(value) => set({ hour: Number(value) })}
        />
      </div>

      {error && (
        <p className="bg-red-light p-4 rounded-lg mt-6">
          <Icon name="fa-warning" className="mr-2" />
          {error}
        </p>
      )}

      <div className="flex justify-between gap-3 mt-8">
        <div className="flex gap-3">
          <Button type="button" variant="tint" rightIcon="fa-times" onClick={onCancel}>
            Fechar
          </Button>
          {editing && (
            <Button type="button" variant="tint" color="red" rightIcon="fa-trash" onClick={() => onDelete(editing.id)}>
              Remover
            </Button>
          )}
        </div>
        <Button type="button" rightIcon="fa-floppy-disk" onClick={save}>
          Salvar
        </Button>
      </div>
    </Modal>
  );
}
