/** `unit_map_live/components/professional_daily.ex` → `ProfessionalDaily`. */
import { useState } from "react";
import { Icon } from "../../components/Icon.js";
import { Input, InputSwitchCard } from "../../components/Input.js";
import { Avatar } from "../../components/Layout.js";
import { MultiSelect } from "../../components/MultiSelect.js";
import type { ScheduleBlocking, UnitMapData } from "./fixtures.js";
import { field, useFilterForm } from "./flow.js";
import {
  DEFAULT_PROFESSIONAL_TYPES,
  PROFESSIONAL_TYPE_OPTIONS,
  listProfessionalDaily,
  pad,
  patientOptions,
  professionalOptions,
  roomOptions,
  serviceOptions,
  unitHours,
} from "./model.js";
import { DailyGrid, dailyHeadCell, dailyHourCell } from "./dailyGrid.js";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");


/**
 * O bloqueio de agenda do profissional na hora, no visual do
 * `professional_blocking_item/1` da agenda (`scheduling_live/components/week_calendar.ex`),
 * sem o avatar: a coluna já é do profissional.
 */
function BlockingItem({ blocking }: { blocking: ScheduleBlocking }) {
  const time = blocking.blockingType === "slot" ? `${pad(blocking.start!)} - ${pad(blocking.end!)}` : "Dia inteiro";
  return (
    <div className="p-2.5 rounded-xl bg-red-light text-red-dark flex flex-col justify-between" title={blocking.observation}>
      <p className="font-bold text-xs mb-1">Horário da agenda bloqueado</p>
      <p className="text-xs">{time}</p>
      {(blocking.holidayName || blocking.observation) && (
        <p className="text-xs text-red-dark/70 whitespace-nowrap text-ellipsis overflow-hidden w-full">{blocking.holidayName || blocking.observation}</p>
      )}
    </div>
  );
}

/** O dia vem da navegação dia a dia do cabeçalho (`DaySelector`); os bloqueios são por data. */
export function ProfessionalDaily({ data, date }: { data: UnitMapData; date: string }) {
  const [form, set] = useFilterForm({
    patient_ids: [] as string[],
    professional_types: DEFAULT_PROFESSIONAL_TYPES as string[],
    service_ids: [] as string[],
    professional_ids: [] as string[],
    unit_room_ids: [] as string[],
    only_active: true,
    tbd: true,
    show_blockings: true,
  });
  const [focusedPatient, setFocusedPatient] = useState<string | null>(null);
  const hours = unitHours(data);
  const items = listProfessionalDaily(data, date, {
    patientIds: form.patient_ids,
    serviceIds: form.service_ids,
    professionalIds: form.professional_ids,
    unitRoomIds: form.unit_room_ids,
    professionalTypes: form.professional_types,
    onlyActive: form.only_active,
    tbd: form.tbd,
    showBlockings: form.show_blockings,
  });

  return (
    <div>
      <form onSubmit={(event) => event.preventDefault()}>
        <div className="flex flex-wrap items-center gap-4 pb-8 w-full">
          <div className="grid grid-cols-5 gap-4 items-end flex-1">
            <Input
              type="multi_select_search"
              field={field("patient_ids", form.patient_ids)}
              prompt="Pacientes (todos)"
              options={patientOptions(data)}
              className="flex-1"
              onChange={(ids) => set("patient_ids", ids)}
            />

            <MultiSelect
              id="multi-specialties"
              label=""
              field={field("professional_types", form.professional_types)}
              prompt="Perfil (todos)"
              options={PROFESSIONAL_TYPE_OPTIONS}
              className="flex-1"
              onChange={(ids) => set("professional_types", ids)}
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
              options={professionalOptions(data, form.service_ids, form.professional_types)}
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

          <div className="flex flex-wrap gap-4 w-full">
            <InputSwitchCard label="TBD" active={field("tbd", form.tbd)}>
              <Input type="switch" field={field("tbd", form.tbd)} onChange={(event) => set("tbd", event.target.checked)} />
            </InputSwitchCard>

            <InputSwitchCard label="Mostrar bloqueados" active={field("show_blockings", form.show_blockings)}>
              <Input
                type="switch"
                field={field("show_blockings", form.show_blockings)}
                onChange={(event) => set("show_blockings", event.target.checked)}
              />
            </InputSwitchCard>

            <InputSwitchCard label="Apenas Ativos?" active={field("only_active", form.only_active)}>
              <Input
                type="switch"
                field={field("only_active", form.only_active)}
                onChange={(event) => set("only_active", event.target.checked)}
              />
            </InputSwitchCard>
          </div>
        </div>
      </form>

      <DailyGrid columns={items.map((professional) => professional.id)}>
          <thead>
            <tr>
              <td className={dailyHeadCell} align="center">
                <Icon name="fa-user-md" className="text-lg text-brand-purple-dark/60" />
              </td>

              {items.map((professional) => (
                <td key={professional.id} className="bg-white">
                  <div className="flex items-center gap-2 px-2 py-6">
                    <Avatar size="custom" className="w-8 h-8 shrink-0" />

                    <div className="min-w-0">
                      <p className="font-bold text-brand-purple-dark text-xs whitespace-nowrap text-ellipsis overflow-hidden w-full">
                        {professional.name}
                      </p>
                      <p className="text-brand-purple-dark/80 text-xs whitespace-nowrap text-ellipsis overflow-hidden w-full">
                        {professional.specialty}
                      </p>
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
                  {items.map((professional) => {
                    const item = professional.itemByHour.get(hour);
                    const blocking = professional.blockingByHour.get(hour);
                    const inHours = professional.availableHours.includes(hour);
                    const cell = cx("p-1 h-[78px]", !inHours && "bg-brand-purple-dark/10");
                    if (!item && blocking) {
                      return (
                        <td key={professional.id} className={cell}>
                          <BlockingItem blocking={blocking} />
                        </td>
                      );
                    }
                    if (!item) return <td key={professional.id} className={cell}></td>;
                    return (
                      <td key={professional.id} className={cell}>
                        <div
                          onClick={() => setFocusedPatient((current) => (current === item.patient ? null : item.patient))}
                          className={cx(
                            "border p-2.5 rounded-xl cursor-pointer",
                            blocking && "ring-2 ring-red/60",
                            focusedPatient === item.patient
                              ? "bg-brand-purple/10 border-brand-purple/40 text-brand-purple"
                              : form.tbd && professional.tbd
                                ? "bg-orange-50 border-orange-200 text-orange-600"
                                : "bg-brand-blue/10 border-brand-blue/40 text-brand-blue-dark",
                          )}
                        >
                          {blocking && (
                            <p className="mb-1.5 inline-flex items-center gap-1 rounded bg-red-light px-1.5 py-0.5 text-[10px] font-bold text-red-dark">
                              <Icon type="solid" name="fa-ban" /> Horário bloqueado
                            </p>
                          )}
                          <p className="text-xs font-bold whitespace-nowrap text-ellipsis overflow-hidden w-full">{item.patient}</p>
                          <p className="text-xs whitespace-nowrap text-ellipsis overflow-hidden w-full mb-2">{item.service}</p>

                          <p className="text-xs whitespace-nowrap text-ellipsis overflow-hidden w-full">
                            <Icon type="solid" name="fa-door-open" className="mr-1" /> {item.room}
                          </p>
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
