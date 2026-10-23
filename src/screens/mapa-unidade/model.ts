/**
 * Mapa da Unidade — as consultas do monólito sobre os dados sintéticos.
 *
 * Cada função espelha um módulo de `lib/bloomy/unit_maps/` (ou vizinho) e
 * devolve o que o componente LiveView recebe em `@items`, `@patients` ou
 * `@rooms`. As datas são strings ISO ("2026-07-30").
 */
import type { Professional, ProfessionalType, Room, Schedule, Specialty, UnitMapData, Weekday } from "./fixtures.js";

/* ============================================================
   Datas
   ============================================================ */

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + n);
  return toIso(date);
}

/** `Date.day_of_week/1`: 1 = segunda … 7 = domingo. */
export const dayOfWeek = (iso: string) => (((toDate(iso).getUTCDay() + 6) % 7) + 1) as Weekday;

/** `Date.range(Date.beginning_of_week(date), Date.end_of_week(date))`. */
export function weekOf(iso: string): { first: string; last: string } {
  const first = addDays(iso, 1 - dayOfWeek(iso));
  return { first, last: addDays(first, 6) };
}

export function datesIn(range: { first: string; last: string }): string[] {
  const dates: string[] = [];
  for (let d = range.first; d <= range.last; d = addDays(d, 1)) dates.push(d);
  return dates;
}

/** `current_unit.service_hour.start_at.hour..(end_at.hour - 1)`. */
export function unitHours(data: UnitMapData): number[] {
  const { start, end } = data.unit.serviceHour;
  return Array.from({ length: end - start }, (_, i) => start + i);
}

/**
 * Os dias em que a unidade abre, do horário de funcionamento do cadastro da
 * unidade (`current_unit.service_hour.weekdays`). É o único lugar que lê esse
 * dado: quando o cadastro vier de verdade, só a origem de `serviceHour` muda.
 * Sem dia configurado, vale a semana toda, como no `filtered_date_range`.
 */
export const openWeekdays = (data: UnitMapData): Weekday[] =>
  data.unit.serviceHour.weekdays.length > 0 ? data.unit.serviceHour.weekdays : [1, 2, 3, 4, 5, 6, 7];

/** `filtered_date_range`: só os dias do horário de funcionamento. */
export const serviceDates = (data: UnitMapData, dates: string[]) =>
  dates.filter((date) => openWeekdays(data).includes(dayOfWeek(date)));

export const pad = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/** `abbreviated_weekday_names/1`. */
export const SHORT_WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** `weekday_name/1` dos componentes do mapa ("Segunda Feira", sem hífen). */
export const LONG_WEEKDAYS = ["Segunda Feira", "Terça Feira", "Quarta Feira", "Quinta Feira", "Sexta Feira", "Sábado", "Domingo"];

/** `Bloomy.CalendarHelper.weekday_names/1` (o `%A` do `strftime`). */
export const CALENDAR_WEEKDAYS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

/* ============================================================
   Enums
   ============================================================ */

/** `translated_select_bitwise_enums(Professional, :professional_types)`. */
export const PROFESSIONAL_TYPE_OPTIONS: { id: ProfessionalType; label: string }[] = [
  { id: "coordinator", label: "Coordenador" },
  { id: "therapeutic_companion", label: "Terapeuta" },
  { id: "supervisor", label: "Supervisor" },
  { id: "applicator", label: "Aplicador" },
  { id: "specialist", label: "Especialista" },
];

/**
 * O texto do Perfil sem nenhum perfil marcado, que vale todos. Monta a lista
 * das opções; o Phoenix escreve "Todos (Aplicador, Supervisor e Terapeuta)",
 * que deixa coordenador e especialista de fora.
 */
export const ALL_PROFILES_PROMPT = `Todos (${PROFESSIONAL_TYPE_OPTIONS.slice(0, -1)
  .map((o) => o.label)
  .join(", ")} e ${PROFESSIONAL_TYPE_OPTIONS.at(-1)!.label})`;

/** O padrão do filtro Perfil: todos menos coordenador e supervisor. */
export const DEFAULT_PROFESSIONAL_TYPES: ProfessionalType[] = PROFESSIONAL_TYPE_OPTIONS.map((o) => o.id).filter(
  (id) => id !== "coordinator" && id !== "supervisor",
);

/** `specialty.name` de cada especialidade. */
export const SPECIALTY_NAMES: Record<Specialty, string> = {
  psychology: "Psicologia",
  psychopedagogy: "Psicopedagogia",
  phonoaudiology: "Fonoaudiologia",
  physiotherapy: "Fisioterapia",
  psychomotricity: "Psicomotricidade",
  music_therapy: "Musicoterapia",
  occupational_therapy: "Terapia Ocupacional",
  nutritionist: "Nutricionista",
};

/* ============================================================
   Consultas auxiliares
   ============================================================ */

const inPeriod = (periods: { weekday: Weekday; start: number; end: number }[], weekday: Weekday, hour: number) =>
  periods.some((p) => p.weekday === weekday && p.start <= hour && hour < p.end);

const agendaHours = (professional: Professional, weekday: Weekday) =>
  professional.agenda.filter((p) => p.weekday === weekday).flatMap((p) => Array.from({ length: p.end - p.start }, (_, i) => p.start + i));

const hasType = (professional: Professional, types: string[]) =>
  types.length === 0 || professional.types.some((t) => types.includes(t));

/** `ProfessionalFilters.filter(%{"service_ids" => …})`: quem atende algum dos serviços. */
const providesService = (data: UnitMapData, professional: Professional, serviceIds: string[]) =>
  serviceIds.length === 0 ||
  data.services.some((s) => serviceIds.includes(s.id) && s.specialty === professional.specialty);

const nameOf = <T extends { id: string; name: string }>(list: T[], id: string | null) => list.find((x) => x.id === id)?.name;

export const roomLabel = (room: Room) => `${room.name} - ${room.number}`;

/** `format_professional_name/1`. */
export function formatProfessionalName(data: UnitMapData, professionalId: string | null) {
  const professional = data.professionals.find((p) => p.id === professionalId);
  if (!professional) return "Sem Profissional";
  return professional.tbd ? `(TBD) ${professional.name}` : professional.name;
}

/* ============================================================
   Unidade: ListSpecialtiesInWeek
   ============================================================ */

export type HeatMapFilters = { professionalTypes: string[]; showTbd: boolean };

function heatMapProfessionals(data: UnitMapData, specialties: string[], { professionalTypes, showTbd }: HeatMapFilters) {
  if (specialties.length === 0) return [];
  return data.professionals.filter(
    (p) =>
      p.active &&
      p.agenda.length > 0 &&
      specialties.includes(p.specialty) &&
      hasType(p, professionalTypes) &&
      (showTbd || !p.tbd),
  );
}

/** O bloqueio de agenda do profissional que pega a data e a hora, se houver. */
export function blockingAt(data: UnitMapData, professionalId: string, date: string, hour: number) {
  return data.scheduleBlockings.find(
    (b) =>
      b.professionalId === professionalId &&
      b.startDate <= date &&
      date <= b.endDate &&
      (b.blockingType === "time_period" || (b.start! <= hour && hour < b.end!)),
  );
}

/**
 * `in_professional_hour?/3`: na agenda padrão, sem agendamento, sem reserva
 * e, quando há data, sem bloqueio de agenda.
 */
export function inProfessionalHour(data: UnitMapData, professional: Professional, weekday: Weekday, hour: number, date?: string) {
  return (
    inPeriod(professional.agenda, weekday, hour) &&
    !(date && blockingAt(data, professional.id, date, hour)) &&
    !data.schedules.some((s) => s.professionalId === professional.id && s.weekday === weekday && s.hour === hour) &&
    !data.reservedSlots.some((r) => r.professionalId === professional.id && inPeriod([r], weekday, hour))
  );
}

const bySpecialty = (professionals: Professional[]) => {
  const groups = new Map<Specialty, Professional[]>();
  for (const p of [...professionals].sort((a, b) => a.specialty.localeCompare(b.specialty))) {
    groups.set(p.specialty, [...(groups.get(p.specialty) ?? []), p]);
  }
  return groups;
};

/**
 * `ListSpecialtiesInWeek.list/5`: as horas livres por dia, hora e
 * especialidade, e o total da semana por especialidade. Sem especialidade
 * escolhida, não há profissional, e a grade e os totais voltam vazios.
 */
export function listSpecialtiesInWeek(data: UnitMapData, dates: string[], specialties: string[], filters: HeatMapFilters) {
  const groups = bySpecialty(heatMapProfessionals(data, specialties, filters));
  const hours = unitHours(data);
  const items = new Map<string, Map<number, [Specialty, number][]>>();
  const counts: Partial<Record<Specialty, number>> = {};

  if (groups.size > 0) {
    for (const date of serviceDates(data, dates)) {
      const weekday = dayOfWeek(date);
      items.set(
        date,
        new Map(
          hours.map((hour) => [
            hour,
            [...groups].map(([slug, list]) => [slug, list.filter((p) => inProfessionalHour(data, p, weekday, hour, date)).length] as [Specialty, number]),
          ]),
        ),
      );
    }
  }
  for (const [slug, list] of groups) {
    counts[slug] = dates
      .map((date) => list.map((p) => hours.filter((h) => inProfessionalHour(data, p, dayOfWeek(date), h, date)).length).reduce((a, b) => a + b, 0))
      .reduce((a, b) => a + b, 0);
  }
  return { items, counts };
}

/** `ListSpecialtiesInWeek.list_day/5`: quem está livre na hora, por especialidade. */
export function listDay(data: UnitMapData, date: string, hour: number, specialties: string[], filters: HeatMapFilters) {
  const weekday = dayOfWeek(date);
  return [...bySpecialty(heatMapProfessionals(data, specialties, filters))].map(
    ([slug, list]) => [slug, list.filter((p) => inProfessionalHour(data, p, weekday, hour, date))] as const,
  );
}

/* ============================================================
   Paciente: FetchPatientsForUnit + FetchSchedulesForPatients
   ============================================================ */

export type PatientFilters = {
  patientIds: string[];
  serviceIds: string[];
  professionalIds: string[];
  showTbd: boolean;
  showReserved: boolean;
};

export type PatientScheduleItem = {
  id?: string;
  date: string;
  hour: number;
  professionalName: string;
  serviceName: string;
  status?: Schedule["status"];
  /** Incompleto e sem profissional: o único que abre o modal de edição. */
  editable: boolean;
  reserved: boolean;
};

function scheduleMatches(data: UnitMapData, s: { professionalId: string | null; serviceId: string }, f: { serviceIds: string[]; professionalIds: string[]; showTbd: boolean }) {
  const professional = data.professionals.find((p) => p.id === s.professionalId);
  return (
    (f.serviceIds.length === 0 || f.serviceIds.includes(s.serviceId)) &&
    (f.professionalIds.length === 0 || (s.professionalId != null && f.professionalIds.includes(s.professionalId))) &&
    (f.showTbd || !professional?.tbd)
  );
}

export function fetchPatientsWithSchedules(data: UnitMapData, dates: string[], f: PatientFilters) {
  const patients = f.patientIds.length === 0 ? data.patients : data.patients.filter((p) => f.patientIds.includes(p.id));
  return patients.map((patient) => {
    const schedules: PatientScheduleItem[] = dates.flatMap((date) =>
      data.schedules
        .filter((s) => s.patientId === patient.id && s.weekday === dayOfWeek(date) && scheduleMatches(data, s, f))
        .map((s) => ({
          id: s.id,
          date,
          hour: s.hour,
          professionalName: formatProfessionalName(data, s.professionalId),
          serviceName: nameOf(data.services, s.serviceId) ?? "-",
          status: s.status,
          editable: s.status === "incomplete" && s.professionalId == null,
          reserved: false,
        })),
    );
    const reserved: PatientScheduleItem[] = f.showReserved
      ? dates.flatMap((date) =>
          data.reservedSlots
            .filter((r) => r.patientId === patient.id && r.weekday === dayOfWeek(date) && scheduleMatches(data, r, f))
            .flatMap((r) =>
              Array.from({ length: r.end - r.start }, (_, i) => ({
                date,
                hour: r.start + i,
                professionalName: formatProfessionalName(data, r.professionalId),
                serviceName: nameOf(data.services, r.serviceId) ?? "-",
                editable: false,
                reserved: true,
              })),
            ),
        )
      : [];
    return { ...patient, schedules: [...schedules, ...reserved] };
  });
}

export const hasPreference = (agendas: { weekday: Weekday; start: number; end: number }[], date: string, hour: number) =>
  agendas.some((a) => a.weekday === dayOfWeek(date) && a.start <= hour && a.end >= hour);

/* ============================================================
   Profissional na semana: ListWithDefinedAgendaHoursWeek
   ============================================================ */

export type ProfessionalWeekFilters = {
  serviceIds: string[];
  professionalIds: string[];
  professionalTypes: string[];
  onlyActive: boolean;
  showReserved: boolean;
  tbd: boolean;
};

export type WeekItem = {
  patient: string;
  patientId: string;
  service: string;
  serviceId: string;
  room: string;
  reserved: boolean;
};

function filterProfessionals(data: UnitMapData, f: { serviceIds: string[]; professionalIds: string[]; professionalTypes: string[]; onlyActive: boolean }) {
  return data.professionals.filter(
    (p) =>
      p.agenda.length > 0 &&
      (!f.onlyActive || p.active) &&
      (f.professionalIds.length === 0 || f.professionalIds.includes(p.id)) &&
      providesService(data, p, f.serviceIds) &&
      hasType(p, f.professionalTypes),
  );
}

const occupancy = (items: Map<number, unknown>, available: number[]) =>
  available.length === 0 ? 0 : Math.round((available.filter((h) => items.has(h)).length / available.length) * 100);

/**
 * Diferente do Phoenix, que lista os sete dias: aqui só os dias em que a
 * unidade abre (`serviceDates`), como as visões de Paciente e Sala.
 */
export function listProfessionalWeek(data: UnitMapData, dates: string[], f: ProfessionalWeekFilters) {
  return filterProfessionals(data, f)
    .filter((p) => f.tbd || !p.tbd)
    .map((professional) => {
      const days = serviceDates(data, dates).map((date) => {
        const weekday = dayOfWeek(date);
        const items = new Map<number, WeekItem>();
        if (f.showReserved) {
          for (const r of data.reservedSlots.filter((r) => r.professionalId === professional.id && r.weekday === weekday)) {
            for (let h = r.start; h < r.end; h++) {
              items.set(h, {
                patient: nameOf(data.patients, r.patientId) ?? "-",
                patientId: r.patientId,
                service: nameOf(data.services, r.serviceId) ?? "-",
                serviceId: r.serviceId,
                room: nameOf(data.rooms, r.roomId) ?? "-",
                reserved: true,
              });
            }
          }
        }
        for (const s of data.schedules.filter((s) => s.professionalId === professional.id && s.weekday === weekday)) {
          items.set(s.hour, {
            patient: nameOf(data.patients, s.patientId) ?? "-",
            patientId: s.patientId,
            service: nameOf(data.services, s.serviceId) ?? "-",
            serviceId: s.serviceId,
            room: nameOf(data.rooms, s.roomId) ?? "-",
            reserved: false,
          });
        }
        const availableHours = agendaHours(professional, weekday);
        return { date, weekdayName: LONG_WEEKDAYS[weekday - 1]!, itemsByHour: items, availableHours, dailyOccupancy: occupancy(items, availableHours) };
      });

      const totalSlots = days.reduce((n, d) => n + d.availableHours.length, 0);
      const totalOccupied = days.reduce((n, d) => n + d.availableHours.filter((h) => d.itemsByHour.has(h)).length, 0);
      const hours = new Map<number, number>();
      for (const hour of new Set(days.flatMap((d) => d.availableHours))) {
        const withHour = days.filter((d) => d.availableHours.includes(hour));
        hours.set(hour, Math.round((withHour.filter((d) => d.itemsByHour.has(hour)).length / withHour.length) * 100));
      }

      return {
        professional: { ...professional, specialtyName: SPECIALTY_NAMES[professional.specialty] },
        days,
        stats: { totalOccupancy: totalSlots === 0 ? 0 : Math.round((totalOccupied / totalSlots) * 100), hours },
      };
    })
    .sort((a, b) => a.professional.name.localeCompare(b.professional.name));
}

/* ============================================================
   Profissional no dia: ListWithDefinedAgendaHours
   ============================================================ */

export type DailyFilters = {
  patientIds: string[];
  serviceIds: string[];
  professionalIds: string[];
  unitRoomIds: string[];
};

/** O mapa de horas do dia: os agendamentos e reservas com profissional, uma linha por hora. */
function hourMapAgendas(data: UnitMapData, weekday: Weekday) {
  return [
    ...data.reservedSlots
      .filter((r) => r.weekday === weekday)
      .flatMap((r) => Array.from({ length: r.end - r.start }, (_, i) => ({ ...r, hour: r.start + i }))),
    ...data.schedules.filter((s) => s.weekday === weekday),
  ];
}

/**
 * Com `tbd` desligado, os profissionais TBD saem (como na semana); com
 * `showBlockings`, cada hora traz o bloqueio de agenda do dia, se houver.
 */
export function listProfessionalDaily(
  data: UnitMapData,
  date: string,
  f: DailyFilters & { professionalTypes: string[]; onlyActive: boolean; tbd: boolean; showBlockings: boolean },
) {
  const weekday = dayOfWeek(date);
  const agendas = hourMapAgendas(data, weekday);
  return filterProfessionals(data, f)
    .filter((p) => f.tbd || !p.tbd)
    .filter((p) => f.unitRoomIds.length === 0 || agendas.some((a) => a.professionalId === p.id && a.roomId != null && f.unitRoomIds.includes(a.roomId)))
    .filter((p) => f.patientIds.length === 0 || agendas.some((a) => a.professionalId === p.id && f.patientIds.includes(a.patientId)))
    .map((p) => ({
      id: p.id,
      name: p.name,
      specialty: SPECIALTY_NAMES[p.specialty],
      tbd: p.tbd,
      availableHours: agendaHours(p, weekday),
      blockingByHour: new Map(
        f.showBlockings
          ? agendaHours(p, weekday).flatMap((h) => {
              const b = blockingAt(data, p.id, date, h);
              return b ? [[h, b] as const] : [];
            })
          : [],
      ),
      itemByHour: new Map(
        agendas
          .filter((a) => a.professionalId === p.id)
          .map((a) => [
            a.hour,
            { patient: nameOf(data.patients, a.patientId) ?? "-", service: nameOf(data.services, a.serviceId) ?? "-", room: nameOf(data.rooms, a.roomId) ?? "-" },
          ]),
      ),
    }));
}

/* ============================================================
   Sala no dia: ListRoomWithDefinedAgendaHours
   ============================================================ */

export function listRoomDaily(data: UnitMapData, weekday: Weekday, f: DailyFilters) {
  const agendas = hourMapAgendas(data, weekday).filter(
    (a) =>
      (f.patientIds.length === 0 || f.patientIds.includes(a.patientId)) &&
      (f.serviceIds.length === 0 || f.serviceIds.includes(a.serviceId)) &&
      (f.professionalIds.length === 0 || (a.professionalId != null && f.professionalIds.includes(a.professionalId))),
  );
  return data.rooms
    .filter((r) => f.unitRoomIds.length === 0 || f.unitRoomIds.includes(r.id))
    .map((room) => ({
      id: room.id,
      name: room.name,
      availableHours: unitHours(data),
      itemByHour: new Map(
        agendas
          .filter((a) => a.roomId === room.id)
          .map((a) => [
            a.hour,
            {
              patient: nameOf(data.patients, a.patientId) ?? "-",
              professional: nameOf(data.professionals, a.professionalId) ?? "-",
              service: nameOf(data.services, a.serviceId) ?? "-",
            },
          ]),
      ),
    }));
}

/* ============================================================
   Sala na semana: FetchRoomsForUnit + FetchSchedulesForRooms
   ============================================================ */

export type RoomWeekFilters = { patientIds: string[]; professionalIds: string[]; serviceIds: string[]; showTbd: boolean };

export function fetchRoomsWithSchedules(data: UnitMapData, dates: string[], f: RoomWeekFilters) {
  return data.rooms.map((room) => ({
    ...room,
    schedules: dates.flatMap((date) =>
      data.schedules
        .filter(
          (s) =>
            s.roomId === room.id &&
            s.weekday === dayOfWeek(date) &&
            (f.patientIds.length === 0 || f.patientIds.includes(s.patientId)) &&
            scheduleMatches(data, s, f),
        )
        .map((s) => ({
          date,
          hour: s.hour,
          professionalName: formatProfessionalName(data, s.professionalId),
          patientName: nameOf(data.patients, s.patientId) ?? "-",
        })),
    ),
  }));
}

/* ============================================================
   Opções dos filtros
   ============================================================ */

export const patientOptions = (data: UnitMapData) => data.patients.map((p) => ({ label: p.name, value: p.id }));
export const serviceOptions = (data: UnitMapData) => data.services.map((s) => ({ label: s.name, value: s.id }));
export const roomOptions = (data: UnitMapData) => data.rooms.map((r) => ({ label: roomLabel(r), value: r.id }));

export function professionalOptions(data: UnitMapData, serviceIds: string[] = [], professionalTypes: string[] = []) {
  return data.professionals
    .filter((p) => p.active && providesService(data, p, serviceIds) && hasType(p, professionalTypes))
    .map((p) => ({ label: p.name, value: p.id }));
}
