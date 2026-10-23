/** `unit_map_live/components/room_daily.ex` → `RoomDaily`. */
import { useState } from "react";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import type { UnitMapData } from "./fixtures.js";
import { field, useFilterForm } from "./flow.js";
import { dayOfWeek, listRoomDaily, pad, patientOptions, professionalOptions, roomOptions, serviceOptions, unitHours } from "./model.js";
import { DailyGrid, dailyHeadCell, dailyHourCell } from "./dailyGrid.js";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

/** O dia vem da navegação dia a dia do cabeçalho (`DaySelector`). */
export function RoomDaily({ data, date }: { data: UnitMapData; date: string }) {
  const [form, set] = useFilterForm({
    patient_ids: [] as string[],
    service_ids: [] as string[],
    professional_ids: [] as string[],
    unit_room_ids: [] as string[],
  });
  const [focusedPatient, setFocusedPatient] = useState<string | null>(null);
  const hours = unitHours(data);
  const items = listRoomDaily(data, dayOfWeek(date), {
    patientIds: form.patient_ids,
    serviceIds: form.service_ids,
    professionalIds: form.professional_ids,
    unitRoomIds: form.unit_room_ids,
  });

  return (
    <div>
      <form onSubmit={(event) => event.preventDefault()}>
        <div className="flex flex-wrap items-center gap-4 pb-8">
          <Input
            type="multi_select_search"
            field={field("patient_ids", form.patient_ids)}
            prompt="Pacientes (todos)"
            options={patientOptions(data)}
            className="flex-1"
            onChange={(ids) => set("patient_ids", ids)}
          />

          <Input
            type="multi_select_search"
            field={field("service_ids", form.service_ids)}
            prompt="Serviços (todos)"
            options={serviceOptions(data)}
            className="flex-1"
            onChange={(ids) => set("service_ids", ids)}
          />
          <Input
            type="multi_select_search"
            field={field("professional_ids", form.professional_ids)}
            prompt="Profissional (todos)"
            options={professionalOptions(data)}
            className="flex-1"
            onChange={(ids) => set("professional_ids", ids)}
          />

          <Input
            type="multi_select_search"
            field={field("unit_room_ids", form.unit_room_ids)}
            prompt="Salas (todos)"
            options={roomOptions(data)}
            className="flex-1"
            onChange={(ids) => set("unit_room_ids", ids)}
          />
        </div>
      </form>

      <DailyGrid columns={items.map((room) => room.id)}>
          <thead>
            <tr>
              <td className={dailyHeadCell} align="center">
                <Icon name="fa-user-md" className="text-lg text-brand-purple-dark/60" />
              </td>

              {items.map((room) => (
                <td key={room.id} className="bg-white">
                  <div className="flex items-center gap-2 px-2 py-6">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-brand-blue/20 flex items-center justify-center">
                      <Icon type="solid" name="fa-door-open" className="text-brand-blue-dark" />
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-brand-purple-dark text-xs whitespace-nowrap text-ellipsis overflow-hidden w-full">{room.name}</p>
                    </div>
                  </div>
                </td>
              ))}

              {items.length === 0 && <td className="w-full text-center px-3 py-4 text-neutral-600">Nenhum dado encontrado para a pesquisa</td>}
            </tr>
          </thead>

          {items.length > 0 && (
            <tbody>
              {hours.map((hour) => (
                <tr key={hour}>
                  <td className={dailyHourCell}>{pad(hour)}</td>

                  {items.map((room) => {
                    const item = room.itemByHour.get(hour);
                    const inHours = room.availableHours.includes(hour);
                    const cell = cx("p-1 h-[78px]", !inHours && "bg-brand-purple-dark/10");
                    if (!item) return <td key={room.id} className={cell}></td>;
                    return (
                      <td key={room.id} className={cell}>
                        <div
                          onClick={() => setFocusedPatient((current) => (current === item.patient ? null : item.patient))}
                          className={cx(
                            "border p-2.5 rounded-xl cursor-pointer",
                            (focusedPatient === item.patient && "bg-brand-purple/10 border-brand-purple/40 text-brand-purple") ||
                              "bg-brand-blue/10 border-brand-blue/40 text-brand-blue-dark",
                          )}
                        >
                          <p className="text-sm text-brand-blue-dark whitespace-nowrap text-ellipsis overflow-hidden w-full mb-2">{item.service}</p>

                          <p className="text-xs font-bold text-brand-blue-dark whitespace-nowrap text-ellipsis overflow-hidden w-full">
                            {item.professional}
                          </p>
                          <p className="text-xs text-brand-blue-dark whitespace-nowrap text-ellipsis overflow-hidden w-full mb-2">{item.patient}</p>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          )}
      </DailyGrid>
    </div>
  );
}
