/**
 * Mapa da Unidade — `unit_map_live/show.ex` (`UnitMapLive.Show`), a página
 * `/backoffice/mapa-da-unidade`.
 *
 * O cartão com o seletor de semana e os dois `radio_selector` (período e
 * visão) e, embaixo, a tabela da visão escolhida, como o `render_table/2` do
 * original: Paciente (semana), Profissional (semana ou dia), Sala (semana ou
 * dia) e Unidade (mapa de calor por especialidade). O Panorama de vagas é
 * visão nova, vinda do protótipo do Claude Design.
 *
 * A visão e o período vêm dos controles (`mapa-unidade/flow.ts`); os dados, da
 * fixture (`mapa-unidade/fixtures.ts`).
 */
import { useState } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { Card } from "../components/Card.js";
import { RadioSelector } from "../components/Choice.js";
import { WeekSelector } from "../components/DatePickers.js";
import { FlashGroup } from "../components/Feedback.js";
import { TODAY } from "../components/today.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { DaySelector } from "./mapa-unidade/DaySelector.js";
import { UNIT_MAP_DATA, type Schedule, type Specialty, type UnitMapData, type Weekday } from "./mapa-unidade/fixtures.js";
import { PATH, field, type MapPeriod, type MapType } from "./mapa-unidade/flow.js";
import { addDays, datesIn, dayOfWeek, openWeekdays, weekOf } from "./mapa-unidade/model.js";
import { Panorama } from "./mapa-unidade/Panorama.js";
import { PanoramaSimple } from "./mapa-unidade/PanoramaSimple.js";
import { PanoramaVisual } from "./mapa-unidade/PanoramaVisual.js";
import { PatientWeek } from "./mapa-unidade/PatientWeek.js";
import { ProfessionalDaily } from "./mapa-unidade/ProfessionalDaily.js";
import { ProfessionalWeek } from "./mapa-unidade/ProfessionalWeek.js";
import { RoomDaily } from "./mapa-unidade/RoomDaily.js";
import { RoomWeekly } from "./mapa-unidade/RoomWeekly.js";
import { UnitHeatMap } from "./mapa-unidade/UnitHeatMap.js";

const TYPES: MapType[] = ["panorama", "patient", "professional", "room", "unit"];

const ALL_SPECIALTIES: Specialty[] = [
  "psychology", "psychopedagogy", "phonoaudiology", "physiotherapy",
  "psychomotricity", "music_therapy", "occupational_therapy", "nutritionist",
];

const seedSpecialties = (value: string | undefined): Specialty[] =>
  value === "all" ? ALL_SPECIALTIES : value === "psychology" ? ["psychology"] : [];

function Options({
  type,
  view,
  day,
  openWeekdays,
  onDay,
  onChange,
}: {
  type: MapType;
  view: MapPeriod;
  day: string;
  openWeekdays: Weekday[];
  onDay: (day: string) => void;
  onChange: (patch: Record<string, string>) => void;
}) {
  const hasPeriod = type === "professional" || type === "room";
  const range = weekOf(day);
  return (
    <div className="flex items-end justify-between">
      <p className="font-bold text-brand-purple-dark text-lg uppercase">Mapa da Unidades</p>

      {/* Nas visões por dia (Profissional e Sala), a navegação é dia a dia; nas outras, semana a semana. */}
      {(type === "professional" || type === "room") && view === "day" ? (
        <DaySelector date={day} today={TODAY} openWeekdays={openWeekdays} onChange={onDay} />
      ) : (
        <WeekSelector range={range} event={({ first }) => onDay(addDays(first, dayOfWeek(day) - 1))} />
      )}

      <div className="flex flex-col md:flex-row items-center gap-2">
        {/* Semana e dia só valem para Profissional e Sala. Nas outras visões o seletor some, mas guarda o lugar, para os ícones não pularem ao trocar de visão. */}
        <div className={hasPeriod ? undefined : "invisible"} aria-hidden={!hasPeriod}>
          <RadioSelector
            field={field("professional_view", view, "options")}
            radio={[
              { value: "week", icon: "fa-calendar", disabled: !hasPeriod },
              { value: "day", icon: "fa-calendar-day", disabled: !hasPeriod },
            ]}
            onChange={(event) => onChange({ professional_view: event.target.value })}
          />
        </div>

        <RadioSelector
          field={field("type", type, "options")}
          radio={[
            { value: "panorama", icon: "fa-scale-balanced", title: "Panorama de vagas" },
            { value: "patient", icon: "fa-user" },
            { value: "professional", icon: "fa-user-md" },
            { value: "room", icon: "fa-door-open" },
            { value: "unit", icon: "fa-calendar-days" },
          ]}
          onChange={(event) => onChange({ type: event.target.value })}
        />
      </div>
    </div>
  );
}

function UnitMapScreen({ context }: { context: ScenarioContext }) {
  const controls = context.controls;
  const type: MapType = TYPES.includes(controls.type as MapType) ? (controls.type as MapType) : "unit";
  const view: MapPeriod = controls.professional_view === "week" ? "week" : "day";
  const [data, setData] = useState<UnitMapData>(() => (context.data as UnitMapData | undefined) ?? UNIT_MAP_DATA);
  // O dia em foco: a visão por dia mostra ele, as outras mostram a semana dele.
  const [day, setDay] = useState(TODAY);
  const [flash, setFlash] = useState<{ id: number; message: string } | null>(null);
  const range = weekOf(day);
  const dates = datesIn(range);
  const thursday = addDays(range.first, 3);

  const closeOverlay = () => {
    if (controls.overlay && controls.overlay !== "none") context.setControl("overlay", "none");
  };

  const updateSchedule = (schedule: Schedule, professionalId: string) => {
    setData((d) => ({
      ...d,
      schedules: d.schedules.map((s) => (s.id === schedule.id ? { ...s, professionalId, status: "scheduled" } : s)),
    }));
    setFlash((f) => ({ id: (f?.id ?? 0) + 1, message: "Profissional atualizado no mapa de horas" }));
  };

  const incomplete = data.schedules.find((s) => s.status === "incomplete" && s.professionalId == null);
  // O `live_component` com `id="map_table"` remonta quando o módulo muda. O
  // modal do controle "Aberto" abre sem remontar, para não perder os filtros.
  const tableKey = `${type}-${view}-${controls.specialties}-${controls.panorama_version}`;

  const table = (() => {
    switch (type) {
      case "panorama":
        if (controls.panorama_version === "v1") return <Panorama data={data} />;
        if (controls.panorama_version === "simple") return <PanoramaSimple data={data} />;
        return <PanoramaVisual data={data} />;
      case "professional":
        return view === "day" ? <ProfessionalDaily data={data} date={day} /> : <ProfessionalWeek data={data} dates={dates} />;
      case "room":
        return view === "week" ? <RoomWeekly data={data} dates={dates} /> : <RoomDaily data={data} date={day} />;
      case "patient":
        return (
          <PatientWeek
            data={data}
            dates={dates}
            canManage={context.can("unit_maps.manage_unit_map")}
            editScheduleId={controls.overlay === "edit-incomplete" ? incomplete?.id : undefined}
            onUpdate={updateSchedule}
            onCloseEdit={closeOverlay}
          />
        );
      case "unit":
        return (
          <UnitHeatMap
            data={data}
            dates={dates}
            seed={{
              specialties: seedSpecialties(controls.specialties),
              availability: controls.overlay === "availability" ? { date: thursday, hour: 10 } : undefined,
            }}
            onCloseAvailability={closeOverlay}
          />
        );
    }
  })();

  return (
    <BackofficeLayout
      context={context}
      currentPath={PATH}
      currentUnit={data.unit.name}
      flash={flash && <FlashGroup key={flash.id} flash={{ info: flash.message }} />}
    >
      <Card>
        {/* Cabeçalho fixo: gruda no topo ao rolar, por cima das grades (que usam z-10 na coluna fixa). */}
        <form
          onSubmit={(event) => event.preventDefault()}
          className="sticky top-0 z-30 -mx-6 -mt-6 mb-8 rounded-t-2xl border-b border-brand-purple-dark/10 bg-white px-6 pt-6 pb-4"
        >
          <Options
            type={type}
            view={view}
            day={day}
            openWeekdays={openWeekdays(data)}
            onDay={setDay}
            onChange={(patch) => context.setControls(patch)}
          />
        </form>

        <div key={tableKey}>{table}</div>
      </Card>
    </BackofficeLayout>
  );
}

export function UnitMap({ context }: ScreenProps) {
  if (context.isLoading) return null;
  return <UnitMapScreen context={context} />;
}
