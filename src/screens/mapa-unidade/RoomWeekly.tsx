/** `unit_map_live/components/room_weekly.ex` → `RoomWeekly`. */
import { Icon } from "../../components/Icon.js";
import { Input, InputSwitchCard } from "../../components/Input.js";
import type { UnitMapData } from "./fixtures.js";
import { WEEK_FILTER_ROW, field, useFilterForm } from "./flow.js";
import { OccupancyTag } from "./OccupancyTag.js";
import {
  LONG_WEEKDAYS,
  dayOfWeek,
  fetchRoomsWithSchedules,
  pad,
  patientOptions,
  professionalOptions,
  serviceDates,
  serviceOptions,
  unitHours,
} from "./model.js";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

/** Com algum filtro de paciente, profissional ou especialidade, as taxas viram "-" (`null`). */
function percentage(active: boolean, count: number, total: number) {
  if (active) return null;
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

export function RoomWeekly({ data, dates }: { data: UnitMapData; dates: string[] }) {
  const [form, set] = useFilterForm({
    patient_ids: [] as string[],
    professional_ids: [] as string[],
    service_ids: [] as string[],
    show_tbd: true,
  });
  const hours = unitHours(data);
  const filteredDates = serviceDates(data, dates);
  const rooms = fetchRoomsWithSchedules(data, dates, {
    patientIds: form.patient_ids,
    professionalIds: form.professional_ids,
    serviceIds: form.service_ids,
    showTbd: form.show_tbd,
  });
  const activeFilters = form.patient_ids.length > 0 || form.professional_ids.length > 0 || form.service_ids.length > 0;

  return (
    <div>
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
            field={field("professional_ids", form.professional_ids)}
            label="Profissional"
            prompt="Todos"
            options={professionalOptions(data)}
            className="flex-1 min-w-[200px]"
            onChange={(ids) => set("professional_ids", ids)}
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
          <InputSwitchCard className="mt-auto" label="TBD" active={field("show_tbd", form.show_tbd)}>
            <Input type="switch" field={field("show_tbd", form.show_tbd)} onChange={(event) => set("show_tbd", event.target.checked)} />
          </InputSwitchCard>
        </div>
      </form>

      {rooms.map((room) => {
        const roomRate = percentage(activeFilters, room.schedules.length, room.capacity * hours.length * filteredDates.length);
        return (
          <div key={room.id} className="mb-8">
            {/* Mesmo layout das grades semanais de Paciente e Profissional, com as taxas de ocupação da sala. */}
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
                        <div className="w-10 h-10 shrink-0 rounded-full bg-brand-blue/20 flex items-center justify-center">
                          <Icon type="solid" name="fa-door-open" className="text-brand-blue-dark" />
                        </div>
                        <div className="flex-1 overflow-hidden min-w-0">
                          <p className="font-bold text-brand-purple-dark text-sm whitespace-nowrap text-ellipsis overflow-hidden">{room.name}</p>
                          <p className="text-brand-purple-dark/80 text-xs whitespace-nowrap text-ellipsis overflow-hidden">
                            {room.capacity === 1 ? "1/hora" : `Até ${room.capacity}/hora`}
                          </p>
                        </div>
                        <OccupancyTag value={roomRate} scale="room" className="shrink-0 whitespace-nowrap" />
                      </div>
                    </td>
                    {hours.map((hour) => {
                      const rate = percentage(
                        activeFilters,
                        room.schedules.filter((s) => s.hour === hour).length,
                        room.capacity * filteredDates.length,
                      );
                      return (
                        <td key={hour} className="w-32 min-w-[8rem] text-center px-1 py-2 bg-white">
                          <p className="text-sm font-bold text-brand-purple-dark/80">{pad(hour)}</p>
                          <OccupancyTag value={rate} scale="room" />
                        </td>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredDates.map((date) => {
                    const rate = percentage(activeFilters, room.schedules.filter((s) => s.date === date).length, room.capacity * hours.length);
                    return (
                      <tr key={date}>
                        <td className="sticky left-0 z-10 bg-white px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-brand-purple-dark text-sm">{LONG_WEEKDAYS[dayOfWeek(date) - 1]}</p>
                            <OccupancyTag value={rate} scale="room" />
                          </div>
                        </td>
                        {hours.map((hour) => {
                          const schedules = room.schedules.filter((s) => s.date === date && s.hour === hour);
                          if (schedules.length === 0) return <td key={hour} className="p-1 h-[72px]"></td>;
                          if (schedules.length === 1) {
                            const [single] = schedules;
                            return (
                              <td key={hour} className="p-1 h-[72px] bg-brand-blue/10">
                                <p className="text-xs font-bold leading-tight overflow-hidden w-full text-center text-brand-blue-dark line-clamp-2">
                                  {single!.professionalName}
                                </p>
                                <p className="text-xs whitespace-nowrap text-ellipsis overflow-hidden w-full text-center text-brand-blue-dark">
                                  {single!.patientName}
                                </p>
                              </td>
                            );
                          }
                          return (
                            <td key={hour} className="p-1 h-[72px] bg-white">
                              <div className="flex items-center justify-center h-full">
                                <div className="min-w-8 h-8 rounded-lg flex items-center justify-center px-2 bg-brand-blue/10 border border-brand-blue/30">
                                  <span className="text-sm font-bold text-brand-blue-dark">{schedules.length}</span>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {rooms.length === 0 && <p className="text-center py-8 text-neutral-600">Nenhuma sala encontrada</p>}
    </div>
  );
}
