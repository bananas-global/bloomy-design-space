/**
 * `unit_map_live/components/unit_heat_map.ex` → `UnitHeatMap`, com o
 * `HeatMapAvailabilityModal` (`components/heat_map_availability_modal.ex`).
 */
import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon.js";
import { Input, InputSwitchCard } from "../../components/Input.js";
import { Avatar } from "../../components/Layout.js";
import { MultiSelect } from "../../components/MultiSelect.js";
import { Modal } from "../../components/Overlay.js";
import type { Specialty, UnitMapData } from "./fixtures.js";
import { field, useFilterForm } from "./flow.js";
import {
  CALENDAR_WEEKDAYS,
  ALL_PROFILES_PROMPT,
  PROFESSIONAL_TYPE_OPTIONS,
  SHORT_WEEKDAYS,
  SPECIALTY_NAMES,
  dayOfWeek,
  listDay,
  listSpecialtiesInWeek,
  pad,
  unitHours,
} from "./model.js";

type SpecialtyAttrs = { name: string; position: number; hoverClass: string; selectedClass: string; itemClass: string };

/** `specialties/0`. */
export const SPECIALTIES: Record<Specialty, SpecialtyAttrs> = {
  psychology: {
    name: "Psicologia",
    position: 1,
    hoverClass: "hover:bg-brand-blue/10 hover:border-brand-blue/40 hover:text-blue-dark hover:[&_.icon-bg]:bg-blue/20",
    selectedClass: "bg-brand-blue/20 border-brand-blue text-blue-dark [&_.icon-bg]:bg-blue/20",
    itemClass: "bg-brand-blue/10 text-brand-blue-dark [&_.item-bg]:bg-brand-blue-dark",
  },
  psychopedagogy: {
    name: "Pedagogia",
    position: 2,
    hoverClass: "hover:bg-brand-orange/10 hover:border-brand-orange/40 hover:text-orange-dark hover:[&_.icon-bg]:bg-brand-orange/20",
    selectedClass: "bg-brand-orange/20 border-brand-orange text-orange-dark [&_.icon-bg]:bg-brand-orange/20",
    itemClass: "bg-brand-orange/10 text-brand-orange-dark [&_.item-bg]:bg-brand-orange-dark",
  },
  phonoaudiology: {
    name: "Fonoaudiologia",
    position: 3,
    hoverClass: "hover:bg-brand-accent/10 hover:border-brand-accent/40 hover:text-brand-accent-dark hover:[&_.icon-bg]:bg-brand-accent/20",
    selectedClass: "bg-brand-accent/20 border-brand-accent text-brand-accent-dark [&_.icon-bg]:bg-brand-accent/20",
    itemClass: "bg-brand-accent/10 text-brand-accent-dark [&_.item-bg]:bg-brand-accent-dark",
  },
  physiotherapy: {
    name: "Fisioterapia",
    position: 4,
    hoverClass: "hover:bg-brand-green/10 hover:border-brand-green/40 hover:text-green-dark hover:[&_.icon-bg]:bg-brand-green/20",
    selectedClass: "bg-brand-green/20 border-brand-green text-green-dark [&_.icon-bg]:bg-brand-green/20",
    itemClass: "bg-brand-green/10 text-brand-green-dark [&_.item-bg]:bg-brand-green-dark",
  },
  psychomotricity: {
    name: "Psicomotricidade",
    position: 5,
    hoverClass: "hover:bg-brand-info/10 hover:border-brand-info/40 hover:text-brand-info-dark hover:[&_.icon-bg]:bg-brand-info/20",
    selectedClass: "bg-brand-info/20 border-brand-info text-brand-info-dark [&_.icon-bg]:bg-brand-info/20",
    itemClass: "bg-brand-info/10 text-brand-info-dark [&_.item-bg]:bg-brand-info-dark",
  },
  music_therapy: {
    name: "Musicoterapia",
    position: 6,
    hoverClass: "hover:bg-warning/10 hover:border-warning/40 hover:text-warning-dark hover:[&_.icon-bg]:bg-warning/20",
    selectedClass: "bg-warning/20 border-warning text-warning-dark [&_.icon-bg]:bg-warning/20",
    itemClass: "bg-warning/10 text-warning-dark [&_.item-bg]:bg-warning-dark",
  },
  occupational_therapy: {
    name: "T.O.",
    position: 7,
    hoverClass: "hover:bg-brand-red/10 hover:border-brand-red/40 hover:text-brand-red-dark hover:[&_.icon-bg]:bg-brand-red/20",
    selectedClass: "bg-brand-red/20 border-brand-red text-brand-red-dark [&_.icon-bg]:bg-brand-red/20",
    itemClass: "bg-brand-red/10 text-brand-red-dark [&_.item-bg]:bg-brand-red-dark",
  },
  nutritionist: {
    name: "Nutricionista",
    position: 8,
    hoverClass: "hover:bg-fuchsia/10 hover:border-fuchsia/40 hover:text-fuchsia hover:[&_.icon-bg]:bg-fuchsia/20",
    selectedClass: "bg-fuchsia/20 border-fuchsia text-fuchsia [&_.icon-bg]:bg-fuchsia/20",
    itemClass: "bg-fuchsia/10 text-fuchsia [&_.item-bg]:bg-fuchsia",
  },
};

export const ORDERED_SPECIALTIES = (Object.keys(SPECIALTIES) as Specialty[]).sort((a, b) => SPECIALTIES[a].position - SPECIALTIES[b].position);

/** `specialty_icon/1` de `scheduling_live/components/common.ex`. */
const SPECIALTY_ICONS: Partial<Record<Specialty, string>> = {
  phonoaudiology: "fa-face-surprise",
  psychology: "fa-head-side-brain",
  occupational_therapy: "fa-hands-holding-diamond",
  physiotherapy: "fa-user",
  music_therapy: "fa-music",
  nutritionist: "fa-apple-whole",
  psychopedagogy: "fa-book",
  psychomotricity: "fa-person-walking",
};

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

export type HeatMapSeed = { specialties: Specialty[]; availability?: { date: string; hour: number } };

export function UnitHeatMap({
  data,
  dates,
  seed,
  onCloseAvailability,
}: {
  data: UnitMapData;
  dates: string[];
  seed: HeatMapSeed;
  onCloseAvailability: () => void;
}) {
  const [specialties, setSpecialties] = useState<Specialty[]>(seed.specialties);
  // Abre sem filtro: nenhum perfil marcado no Perfil (vale todos) e TBD ligado (TBD entra na conta).
  const [form, set] = useFilterForm({ professional_types: [] as string[], show_tbd: true });
  const [period, setPeriod] = useState<{ date: string; hour: number } | null>(null);
  const { date: seedDate, hour: seedHour } = seed.availability ?? {};
  useEffect(() => {
    if (seedDate && seedHour != null) setPeriod({ date: seedDate, hour: seedHour });
  }, [seedDate, seedHour]);
  const filters = { professionalTypes: form.professional_types, showTbd: form.show_tbd };
  const { items, counts } = listSpecialtiesInWeek(data, dates, specialties, filters);
  const hours = unitHours(data);

  const toggle = (specialty: Specialty) =>
    setSpecialties((list) => (list.includes(specialty) ? list.filter((s) => s !== specialty) : [specialty, ...list]));

  return (
    <div>
      <div className="flex flex-wrap justify-between gap-3 mb-6">
        {ORDERED_SPECIALTIES.map((specialty) => {
          const attrs = SPECIALTIES[specialty];
          const selected = specialties.includes(specialty);
          return (
            <button
              key={specialty}
              type="button"
              className={cx(
                "rounded-xl p-4 flex items-center flex-1 gap-4 border cursor-pointer text-left",
                "transition-all duration-300 ease-in-out active:scale-95",
                attrs.hoverClass,
                (selected && attrs.selectedClass) || "border-brand-purple-dark/10 text-brand-purple-dark/60",
              )}
              onClick={() => toggle(specialty)}
            >
              <div className="rounded w-7 h-7 flex items-center justify-center bg-brand-purple-dark/10 icon-bg transition-all duration-300 ease-in-out">
                <Icon type="solid" name={SPECIALTY_ICONS[specialty] ?? "fa-times"} className="text-sm" />
              </div>

              <div className="flex-1">
                <p className="font-extrabold text-sm/4">{attrs.name}</p>
                <p className="text-xs text-brand-purple-dark/60">{counts[specialty] ?? (selected ? 0 : "?")} horas livres</p>
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={(event) => event.preventDefault()}>
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <MultiSelect
            id="multi-specialties"
            label="Perfil"
            field={field("professional_types", form.professional_types)}
            prompt={ALL_PROFILES_PROMPT}
            options={PROFESSIONAL_TYPE_OPTIONS}
            className="min-w-0 flex-1"
            onChange={(ids) => set("professional_types", ids)}
          />

          <InputSwitchCard className="shrink-0" label="TBD" active={field("show_tbd", form.show_tbd)}>
            <Input type="switch" field={field("show_tbd", form.show_tbd)} onChange={(event) => set("show_tbd", event.target.checked)} />
          </InputSwitchCard>
        </div>
      </form>

      {/* Bordas só à direita e embaixo de cada célula (a de fora é do contêiner); a barra de rolagem só aparece quando a tabela não cabe. */}
      <div className="w-full overflow-x-auto rounded-lg border border-brand-purple-dark/10">
        <table
          className={cx(
            "w-full table-fixed border-separate border-spacing-0",
            "[&_td]:border-b [&_td]:border-r [&_td]:border-brand-purple-dark/10",
            "[&_tr>td:last-child]:border-r-0 [&_tbody>tr:last-child>td]:border-b-0 [&_thead:last-child_td]:border-b-0",
          )}
          style={{ minWidth: 56 + items.size * 166 }}
        >
          <thead>
            <tr>
              <td className="w-14 bg-white sticky left-0 z-10" align="center"></td>

              {[...items.keys()].map((date) => (
                <td key={date} className="p-2 text-end">
                  <p className="text-brand-purple-dark/80 text-sm w-full uppercase">{SHORT_WEEKDAYS[dayOfWeek(date) - 1]}</p>
                </td>
              ))}

              {items.size === 0 && <td className="w-full text-center px-3 py-4 text-neutral-600">Nenhum dado encontrado para a pesquisa</td>}
            </tr>
          </thead>

          {items.size > 0 && (
            <tbody>
              {hours.map((hour) => (
                <tr key={hour}>
                  <td className="w-14 bg-white text-brand-purple-dark/80 text-center sticky left-0 z-10">{pad(hour)}</td>

                  {[...items].map(([date, byHour]) => {
                    const cell = byHour.get(hour) ?? [];
                    const hasItem = cell.some(([, count]) => count > 0);
                    return (
                      <td
                        key={date}
                        onClick={() => setPeriod({ date, hour })}
                        className={cx("p-2 w-40 h-14", hasItem && "cursor-pointer transition-all duration-300 hover:bg-brand-purple-dark/10")}
                      >
                        <div className="flex flex-col gap-2 min-w-[150px] w-full">
                          {cell
                            .filter(([, count]) => count > 0)
                            .map(([specialty, count]) => (
                              <div
                                key={specialty}
                                className={cx(
                                  "flex flex-wrap gap-2 items-center justify-between text-sm font-extrabold h-10 rounded-xl pl-4 pr-2",
                                  SPECIALTIES[specialty].itemClass,
                                )}
                              >
                                {count}

                                <div className="text-sm px-2 py-1 rounded-full font-semibold text-white whitespace-nowrap item-bg">
                                  <p>{SPECIALTIES[specialty].name}</p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      <HeatMapAvailabilityModal
        data={data}
        period={period}
        specialties={specialties}
        filters={filters}
        onCancel={() => {
          setPeriod(null);
          onCloseAvailability();
        }}
      />
    </div>
  );
}

function HeatMapAvailabilityModal({
  data,
  period,
  specialties,
  filters,
  onCancel,
}: {
  data: UnitMapData;
  period: { date: string; hour: number } | null;
  specialties: Specialty[];
  filters: { professionalTypes: string[]; showTbd: boolean };
  onCancel: () => void;
}) {
  if (!period) return null;
  const professionalsBySpecialty = listDay(data, period.date, period.hour, specialties, filters);

  return (
    <div>
      <Modal id="heat_map_availability_modal" show title="Disponibilidade" variant="extra_small" onCancel={onCancel}>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {professionalsBySpecialty.map(([specialty, professionals]) => (
            <div key={specialty} className="space-y-2">
              {professionals.map((professional) => (
                <div key={professional.id} className={cx(SPECIALTIES[specialty].itemClass, "rounded-xl px-3 py-2 flex items-center justify-between text-sm")}>
                  <div className="flex items-center gap-2">
                    <Avatar size="extra_medium" />

                    <div>
                      <p className="font-bold">{professional.name}</p>
                      <p>{SPECIALTY_NAMES[specialty]}</p>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <p>
                      <Icon name="fa-calendar-day" type="solid" className="mr-1" />
                      {CALENDAR_WEEKDAYS[dayOfWeek(period.date) - 1]}
                    </p>
                    <p>
                      <Icon name="fa-clock" type="solid" className="mr-1" />
                      {pad(period.hour)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
