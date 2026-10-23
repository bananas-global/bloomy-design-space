/** `unit_map_live/components/professional_week.ex` → `ProfessionalWeek`. */
import { useState } from "react";
import { Icon } from "../../components/Icon.js";
import { Input, InputSwitchCard } from "../../components/Input.js";
import { Avatar } from "../../components/Layout.js";
import { MultiSelect } from "../../components/MultiSelect.js";
import type { UnitMapData } from "./fixtures.js";
import { WEEK_FILTER_ROW, field, useFilterForm } from "./flow.js";
import { OccupancyTag } from "./OccupancyTag.js";
import {
  DEFAULT_PROFESSIONAL_TYPES,
  ALL_PROFILES_PROMPT,
  PROFESSIONAL_TYPE_OPTIONS,
  listProfessionalWeek,
  pad,
  patientOptions,
  professionalOptions,
  serviceOptions,
  unitHours,
  type WeekItem,
} from "./model.js";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

export function ProfessionalWeek({ data, dates }: { data: UnitMapData; dates: string[] }) {
  const [form, set] = useFilterForm({
    patient_ids: [] as string[],
    professional_types: DEFAULT_PROFESSIONAL_TYPES as string[],
    service_ids: [] as string[],
    professional_ids: [] as string[],
    tbd: true,
    show_reserved: true,
    only_active: true,
  });
  const [focusedPatient, setFocusedPatient] = useState<string | null>(null);
  const hours = unitHours(data);
  const items = listProfessionalWeek(data, dates, {
    serviceIds: form.service_ids,
    professionalIds: form.professional_ids,
    professionalTypes: form.professional_types,
    onlyActive: form.only_active,
    showReserved: form.show_reserved,
    tbd: form.tbd,
  });

  return (
    <div>
      <form onSubmit={(event) => event.preventDefault()}>
        <div className={WEEK_FILTER_ROW}>
          <div className="grow min-w-[200px]">
            <Input
              type="multi_select_search"
              label="Pacientes"
              field={field("patient_ids", form.patient_ids)}
              prompt="Pacientes (todos)"
              options={patientOptions(data)}
              onChange={(ids) => set("patient_ids", ids)}
            />
          </div>

          <div className="grow min-w-[200px]">
            <MultiSelect
              id="multi-specialties"
              label="Perfil"
              field={field("professional_types", form.professional_types)}
              prompt={ALL_PROFILES_PROMPT}
              options={PROFESSIONAL_TYPE_OPTIONS}
              className="flex-1"
              onChange={(ids) => set("professional_types", ids)}
            />
          </div>

          <div className="grow min-w-[200px]">
            <Input
              type="multi_select_search"
              field={field("service_ids", form.service_ids)}
              label="Especialidades"
              prompt="Todas"
              options={serviceOptions(data)}
              onChange={(ids) => set("service_ids", ids)}
            />
          </div>

          <div className="grow min-w-[200px]">
            <Input
              label="Profissional"
              type="multi_select_search"
              field={field("professional_ids", form.professional_ids)}
              prompt="Profissionais"
              options={professionalOptions(data, form.service_ids, form.professional_types)}
              onChange={(ids) => set("professional_ids", ids)}
            />
          </div>

          <div className="shrink-0">
            <InputSwitchCard label="TBD" active={field("tbd", form.tbd)}>
              <Input type="switch" field={field("tbd", form.tbd)} onChange={(event) => set("tbd", event.target.checked)} />
            </InputSwitchCard>
          </div>

          <div className="shrink-0">
            <InputSwitchCard label="Mostrar reservados" active={field("show_reserved", form.show_reserved)}>
              <Input
                type="switch"
                field={field("show_reserved", form.show_reserved)}
                onChange={(event) => set("show_reserved", event.target.checked)}
              />
            </InputSwitchCard>
          </div>

          <div className="shrink-0">
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

      <div className="flex flex-col gap-8">
        {items.length === 0 ? (
          <div className="w-full text-center px-3 py-10 text-neutral-600 bg-white rounded-lg border border-brand-purple-dark/10">
            Nenhum dado encontrado para a pesquisa
          </div>
        ) : (
          items.map((professionalData) => (
            <div
              key={professionalData.professional.id}
              className="w-full overflow-x-auto rounded-lg border border-brand-purple-dark/10 bg-white"
            >
              {/* Bordas só à direita e embaixo de cada célula (a de fora é do contêiner); a barra de rolagem só aparece quando a tabela não cabe. */}
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
                        <Avatar size="custom" className="w-10 h-10" />
                        <div className="flex-1 overflow-hidden min-w-0">
                          <p className="font-bold text-brand-purple-dark text-sm whitespace-nowrap text-ellipsis overflow-hidden">
                            {professionalData.professional.name}
                          </p>
                          <p className="text-brand-purple-dark/80 text-xs whitespace-nowrap text-ellipsis overflow-hidden">
                            {professionalData.professional.specialtyName}
                          </p>
                        </div>
                        <OccupancyTag value={professionalData.stats.totalOccupancy} scale="professional" className="shrink-0 whitespace-nowrap" />
                      </div>
                    </td>

                    {hours.map((hour) => {
                      const value = professionalData.stats.hours.get(hour) ?? 0;
                      return (
                        <td key={hour} className="w-32 min-w-[8rem] text-center px-1 py-2 bg-white">
                          <p className="text-sm font-bold text-brand-purple-dark/80">{pad(hour)}</p>
                          <OccupancyTag value={value} scale="professional" />
                        </td>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {professionalData.days.map((day) => (
                    <tr key={day.date} className="group hover:bg-neutral-50">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-neutral-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-brand-purple-dark text-sm">{day.weekdayName}</p>
                          </div>
                          <OccupancyTag value={day.dailyOccupancy} scale="professional" />
                        </div>
                      </td>

                      {hours.map((hour) => (
                        <ItemCell
                          key={hour}
                          item={day.itemsByHour.get(hour)}
                          inHours={day.availableHours.includes(hour)}
                          focusedPatient={focusedPatient}
                          tbd={form.tbd && professionalData.professional.tbd}
                          patientIds={form.patient_ids}
                          serviceIds={form.service_ids}
                          onFocus={(patient) => setFocusedPatient((current) => (current === patient ? null : patient))}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ItemCell({
  item,
  inHours,
  focusedPatient,
  tbd,
  patientIds,
  serviceIds,
  onFocus,
}: {
  item: WeekItem | undefined;
  inHours: boolean;
  focusedPatient: string | null;
  tbd: boolean;
  patientIds: string[];
  serviceIds: string[];
  onFocus: (patient: string) => void;
}) {
  if (!item) {
    return (
      <td className={cx("p-1 h-[72px]", !inHours && "bg-brand-purple-dark/5")}>
        {!inHours && (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="fa-lock" className="text-brand-purple-dark/20 text-xs" />
          </div>
        )}
      </td>
    );
  }

  const colors =
    focusedPatient === item.patient
      ? "bg-brand-purple/10 border-brand-purple/40 text-brand-purple"
      : tbd
        ? "bg-orange-50 border-orange-200 text-orange-600 hover:border-orange-400"
        : patientIds.includes(item.patientId) || serviceIds.includes(item.serviceId)
          ? "bg-brand-purple-dark/5 text-brand-blue-dark"
          : item.reserved
            ? "bg-stone-50 border-stone-300 text-stone-500 hover:border-stone-400"
            : "bg-white border-brand-blue/20 text-brand-blue-dark hover:border-brand-blue/40";

  return (
    <td className={cx("p-1 h-[72px]", !inHours && "bg-brand-purple-dark/5")}>
      <div
        onClick={() => onFocus(item.patient)}
        className={cx("border px-2 py-1.5 rounded-lg cursor-pointer h-full text-xs transition-colors shadow-sm", colors)}
      >
        {/* "Reserva" na linha do paciente, para o cartão caber na linha de 72px. */}
        <div className="flex items-center gap-1 mb-0.5">
          <p className="min-w-0 font-bold whitespace-nowrap text-ellipsis overflow-hidden">{item.patient}</p>
          {item.reserved && <span className="shrink-0 text-[10px] font-bold text-neutral-500">Reserva</span>}
        </div>
        {item.service !== "-" && (
          <p className="text-[10px] text-neutral-500 whitespace-nowrap text-ellipsis overflow-hidden w-full mb-1">{item.service}</p>
        )}
        {item.room !== "-" && <p className="text-[10px] font-medium whitespace-nowrap text-ellipsis overflow-hidden w-full">{item.room}</p>}
      </div>
    </td>
  );
}
