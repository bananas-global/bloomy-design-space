/**
 * Mapa da Unidade — dados sintéticos e determinísticos.
 *
 * Uma unidade com horário das 08h às 18h, de segunda a sexta. A agenda é um
 * molde semanal (`weekday` 1 = segunda … 7 = domingo, como `Date.day_of_week`),
 * repetido em toda semana que o seletor mostrar. Nomes são fictícios.
 *
 * - `professionals[].agenda`: a agenda padrão (`standard_agendas`) na unidade.
 * - `schedules`: os agendamentos; `professionalId: null` é "Sem Profissional" e
 *   `status: "incomplete"` é o agendamento incompleto do mapa de horas.
 * - `reservedSlots`: os horários reservados de um mapa de horas em criação.
 * - `patients[].agendas`: as preferências de horário do paciente (a estrela).
 */
import type { Fixture } from "@brucesantos/design-space";

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Specialty =
  | "psychology"
  | "psychopedagogy"
  | "phonoaudiology"
  | "physiotherapy"
  | "psychomotricity"
  | "music_therapy"
  | "occupational_therapy"
  | "nutritionist";

export type ProfessionalType = "coordinator" | "therapeutic_companion" | "supervisor" | "applicator" | "specialist";

/** Um intervalo de horas cheias: `start` entra, `end` não. */
export type Period = { weekday: Weekday; start: number; end: number };

export type Professional = {
  id: string;
  name: string;
  specialty: Specialty;
  types: ProfessionalType[];
  tbd: boolean;
  active: boolean;
  agenda: Period[];
};

export type Patient = { id: string; name: string; agendas: Period[] };

export type Service = { id: string; name: string; specialty: Specialty };

export type Room = { id: string; name: string; number: number; capacity: number };

export type Schedule = {
  id: string;
  patientId: string;
  professionalId: string | null;
  serviceId: string;
  roomId: string | null;
  weekday: Weekday;
  hour: number;
  status: "scheduled" | "incomplete";
};

export type ReservedSlot = {
  patientId: string;
  professionalId: string | null;
  serviceId: string;
  roomId: string | null;
  weekday: Weekday;
  start: number;
  end: number;
};

/**
 * Bloqueio de agenda do profissional (`Bloomy.Professionals.ScheduleBlocking`):
 * `slot` bloqueia das `start` às `end` num dia; `time_period` bloqueia os dias
 * inteiros de `startDate` a `endDate`. Datas ISO.
 */
export type ScheduleBlocking = {
  id: string;
  professionalId: string;
  blockingType: "slot" | "time_period";
  startDate: string;
  endDate: string;
  start?: number;
  end?: number;
  observation?: string;
  holidayName?: string;
};

/**
 * Um lead do funil, na forma do CRM de Leads (PR #42): as horas pedidas por
 * especialidade e a disponibilidade da família. O Panorama de vagas soma esses
 * pedidos à demanda.
 */
export type LeadStatus = "novo" | "contato" | "avaliacao" | "agendada" | "proposta" | "aguardando" | "perdido";

export type Lead = {
  id: string;
  child: string;
  status: LeadStatus;
  specialties: { spec: string; hours: number }[];
  availability: { day: string; from: string; to: string }[];
};

/**
 * O horário de funcionamento do cadastro da unidade (`current_unit.service_hour`:
 * `start_at`, `end_at` e `weekdays`). Hoje vem da fixture; para ligar ao cadastro
 * de verdade, basta preencher este campo a partir dele: as visões leem os dias
 * só por `openWeekdays` (em `model.ts`) e as horas só por `unitHours`.
 */
export type ServiceHour = { start: number; end: number; weekdays: Weekday[] };

export type UnitMapData = {
  unit: { id: string; name: string; serviceHour: ServiceHour };
  professionals: Professional[];
  patients: Patient[];
  services: Service[];
  rooms: Room[];
  schedules: Schedule[];
  reservedSlots: ReservedSlot[];
  scheduleBlockings: ScheduleBlocking[];
  leads: Lead[];
};

const WEEK: Weekday[] = [1, 2, 3, 4, 5];

const days = (weekdays: Weekday[], start: number, end: number): Period[] =>
  weekdays.map((weekday) => ({ weekday, start, end }));

const PROFESSIONALS: Professional[] = [
  { id: "p1", name: "Helena Martins Costa", specialty: "psychology", types: ["therapeutic_companion"], tbd: false, active: true,
    agenda: [...days(WEEK, 8, 12), ...days(WEEK, 13, 17)] },
  { id: "p2", name: "Rafael Souza Lima", specialty: "psychology", types: ["applicator"], tbd: false, active: true, agenda: days(WEEK, 13, 18) },
  { id: "p3", name: "Camila Ferreira Dias", specialty: "phonoaudiology", types: ["specialist"], tbd: false, active: true, agenda: days([1, 3, 5], 8, 14) },
  { id: "p4", name: "Bruno Alves Rocha", specialty: "occupational_therapy", types: ["specialist"], tbd: false, active: true, agenda: days([2, 4], 8, 17) },
  { id: "p5", name: "Larissa Monteiro", specialty: "psychopedagogy", types: ["specialist"], tbd: false, active: true, agenda: days([1, 2, 3, 4], 13, 18) },
  { id: "p6", name: "Thiago Nunes Barreto", specialty: "physiotherapy", types: ["specialist"], tbd: false, active: true, agenda: days(WEEK, 8, 12) },
  { id: "p7", name: "Juliana Prado", specialty: "psychology", types: ["therapeutic_companion"], tbd: true, active: true, agenda: days(WEEK, 8, 17) },
  { id: "p8", name: "Mariana Castro Leal", specialty: "music_therapy", types: ["specialist"], tbd: false, active: true, agenda: days([3, 5], 9, 15) },
  { id: "p9", name: "Gustavo Ribeiro", specialty: "psychomotricity", types: ["specialist"], tbd: false, active: true, agenda: days([2, 4], 13, 18) },
  { id: "p10", name: "Patrícia Gomes", specialty: "psychology", types: ["supervisor"], tbd: false, active: true, agenda: days(WEEK, 8, 17) },
  { id: "p11", name: "Lívia Andrade", specialty: "nutritionist", types: ["specialist"], tbd: false, active: false, agenda: days([4], 8, 12) },
  { id: "p12", name: "Eduardo Pires", specialty: "phonoaudiology", types: ["specialist"], tbd: false, active: true, agenda: days([2, 4], 8, 13) },
];

const PATIENTS: Patient[] = [
  { id: "pa1", name: "Ana Beatriz Moura", agendas: days(WEEK, 8, 11) },
  { id: "pa2", name: "Pedro Henrique Dias", agendas: [] },
  { id: "pa3", name: "Laura Cristina Vieira", agendas: [] },
  { id: "pa4", name: "Miguel Barbosa", agendas: [] },
  { id: "pa5", name: "Sofia Carvalho", agendas: days([1], 15, 17) },
  { id: "pa6", name: "Davi Lucas Teixeira", agendas: days([2, 4], 15, 16) },
  { id: "pa7", name: "Isabela Freitas", agendas: days([3], 14, 15) },
  { id: "pa8", name: "Lucas Gabriel Ramos", agendas: [] },
];

const SERVICES: Service[] = [
  { id: "s1", name: "Psicologia ABA", specialty: "psychology" },
  { id: "s2", name: "Fonoaudiologia", specialty: "phonoaudiology" },
  { id: "s3", name: "Terapia Ocupacional", specialty: "occupational_therapy" },
  { id: "s4", name: "Psicopedagogia", specialty: "psychopedagogy" },
  { id: "s5", name: "Fisioterapia", specialty: "physiotherapy" },
  { id: "s6", name: "Musicoterapia", specialty: "music_therapy" },
  { id: "s7", name: "Psicomotricidade", specialty: "psychomotricity" },
  { id: "s8", name: "Nutrição", specialty: "nutritionist" },
];

const ROOMS: Room[] = [
  { id: "r1", name: "Sala Azul", number: 1, capacity: 2 },
  { id: "r2", name: "Sala Verde", number: 2, capacity: 1 },
  { id: "r3", name: "Sala Amarela", number: 3, capacity: 1 },
  { id: "r4", name: "Sala de Integração Sensorial", number: 4, capacity: 3 },
  { id: "r5", name: "Consultório 1", number: 5, capacity: 1 },
  { id: "r6", name: "Ginásio", number: 6, capacity: 4 },
];

type Block = Omit<Schedule, "id" | "weekday" | "hour" | "status"> & {
  weekdays: Weekday[];
  hours: number[];
  status?: Schedule["status"];
};

/** Os agendamentos da semana, em blocos de dias × horas. */
const BLOCKS: Block[] = [
  { patientId: "pa1", professionalId: "p1", serviceId: "s1", roomId: "r1", weekdays: WEEK, hours: [8, 9] },
  { patientId: "pa1", professionalId: "p3", serviceId: "s2", roomId: "r5", weekdays: [1, 3], hours: [10] },
  { patientId: "pa1", professionalId: "p4", serviceId: "s3", roomId: "r4", weekdays: [2, 4], hours: [10, 11] },
  { patientId: "pa2", professionalId: "p1", serviceId: "s1", roomId: "r1", weekdays: WEEK, hours: [10, 11] },
  { patientId: "pa2", professionalId: "p3", serviceId: "s2", roomId: "r5", weekdays: [5], hours: [8, 9] },
  { patientId: "pa3", professionalId: "p2", serviceId: "s1", roomId: "r2", weekdays: WEEK, hours: [14, 15] },
  { patientId: "pa3", professionalId: "p5", serviceId: "s4", roomId: "r3", weekdays: [1, 3], hours: [16] },
  { patientId: "pa4", professionalId: "p7", serviceId: "s1", roomId: "r1", weekdays: WEEK, hours: [13, 14] },
  { patientId: "pa4", professionalId: "p6", serviceId: "s5", roomId: "r6", weekdays: [2, 4], hours: [9] },
  { patientId: "pa5", professionalId: "p1", serviceId: "s1", roomId: "r1", weekdays: [1, 3, 5], hours: [13, 14, 15] },
  { patientId: "pa5", professionalId: "p8", serviceId: "s6", roomId: "r4", weekdays: [3], hours: [10] },
  { patientId: "pa5", professionalId: "p8", serviceId: "s6", roomId: "r4", weekdays: [5], hours: [11] },
  { patientId: "pa5", professionalId: null, serviceId: "s3", roomId: "r4", weekdays: [1], hours: [16], status: "incomplete" },
  { patientId: "pa6", professionalId: "p2", serviceId: "s1", roomId: "r2", weekdays: WEEK, hours: [16, 17] },
  { patientId: "pa6", professionalId: "p9", serviceId: "s7", roomId: "r6", weekdays: [2, 4], hours: [14] },
  { patientId: "pa6", professionalId: "p12", serviceId: "s2", roomId: "r5", weekdays: [2, 4], hours: [8] },
  { patientId: "pa7", professionalId: "p7", serviceId: "s1", roomId: "r1", weekdays: [2, 4], hours: [8, 9] },
  { patientId: "pa7", professionalId: "p4", serviceId: "s3", roomId: "r4", weekdays: [2, 4], hours: [13] },
  { patientId: "pa7", professionalId: null, serviceId: "s2", roomId: "r5", weekdays: [3], hours: [15], status: "incomplete" },
  { patientId: "pa8", professionalId: "p5", serviceId: "s4", roomId: "r3", weekdays: [2, 4], hours: [13, 14] },
  { patientId: "pa8", professionalId: "p6", serviceId: "s5", roomId: "r6", weekdays: [1, 3, 5], hours: [8] },
  { patientId: "pa8", professionalId: "p2", serviceId: "s1", roomId: "r2", weekdays: [5], hours: [13], status: "incomplete" },
];

const SCHEDULES: Schedule[] = BLOCKS.flatMap(({ weekdays, hours, status = "scheduled", ...rest }, b) =>
  weekdays.flatMap((weekday) =>
    hours.map((hour) => ({ ...rest, id: `sc${b + 1}-${weekday}-${hour}`, weekday, hour, status })),
  ),
);

const RESERVED_SLOTS: ReservedSlot[] = [
  { patientId: "pa2", professionalId: "p8", serviceId: "s6", roomId: "r4", weekday: 3, start: 13, end: 15 },
  { patientId: "pa4", professionalId: null, serviceId: "s2", roomId: null, weekday: 4, start: 15, end: 16 },
];

/** Bloqueios na semana de hoje (27/07 a 02/08/2026). */
const SCHEDULE_BLOCKINGS: ScheduleBlocking[] = [
  { id: "bl1", professionalId: "p1", blockingType: "slot", startDate: "2026-07-30", endDate: "2026-07-30", start: 15, end: 17, observation: "Supervisão clínica" },
  { id: "bl2", professionalId: "p3", blockingType: "time_period", startDate: "2026-07-29", endDate: "2026-07-31", observation: "Férias" },
  { id: "bl3", professionalId: "p2", blockingType: "slot", startDate: "2026-07-27", endDate: "2026-07-27", start: 13, end: 14, observation: "Consulta médica" },
];

const LEADS: Lead[] = [
  { id: "ld1", child: "Theo Rocha", status: "avaliacao",
    specialties: [{ spec: "Fonoaudiologia", hours: 4 }, { spec: "Psicologia", hours: 4 }],
    availability: [{ day: "Segunda-Feira", from: "08:00", to: "12:00" }, { day: "Quarta-Feira", from: "08:00", to: "12:00" }] },
  { id: "ld2", child: "Alice Mendes", status: "novo",
    specialties: [{ spec: "Psicologia", hours: 6 }],
    availability: [{ day: "Terça-Feira", from: "13:00", to: "18:00" }] },
  { id: "ld3", child: "Davi Lima", status: "proposta",
    specialties: [{ spec: "Análise do Comportamento", hours: 8 }],
    availability: [{ day: "Terça-Feira", from: "13:00", to: "17:00" }, { day: "Quinta-Feira", from: "13:00", to: "17:00" }] },
  { id: "ld4", child: "Beatriz Faria", status: "aguardando",
    specialties: [{ spec: "Terapia Ocupacional", hours: 4 }],
    availability: [{ day: "Segunda-Feira", from: "14:00", to: "18:00" }, { day: "Sexta-Feira", from: "14:00", to: "18:00" }] },
  { id: "ld5", child: "Bento Costa", status: "agendada",
    specialties: [{ spec: "Fonoaudiologia", hours: 3 }, { spec: "Fisioterapia", hours: 2 }],
    availability: [{ day: "Terça-Feira", from: "08:00", to: "12:00" }, { day: "Quinta-Feira", from: "08:00", to: "12:00" }] },
  { id: "ld6", child: "Lara Nunes", status: "contato",
    specialties: [{ spec: "Psicopedagogia", hours: 2 }],
    availability: [] },
  { id: "ld7", child: "Caio Araújo", status: "perdido",
    specialties: [{ spec: "Psicologia", hours: 10 }],
    availability: [{ day: "Segunda-Feira", from: "08:00", to: "18:00" }] },
];

export const UNIT_MAP_DATA: UnitMapData = {
  unit: { id: "u1", name: "Unidade Jardim", serviceHour: { start: 8, end: 18, weekdays: WEEK } },
  professionals: PROFESSIONALS,
  patients: PATIENTS,
  services: SERVICES,
  rooms: ROOMS,
  schedules: SCHEDULES,
  reservedSlots: RESERVED_SLOTS,
  scheduleBlockings: SCHEDULE_BLOCKINGS,
  leads: LEADS,
};

export const UNIT_MAP_FIXTURES: Fixture<UnitMapData>[] = [
  {
    id: "unit-map.default",
    label: "Unidade Jardim · semana típica",
    description:
      "Doze profissionais (uma supervisora, uma inativa e uma TBD), oito pacientes e seis salas. Há agendamentos incompletos sem profissional, horários reservados de um mapa de horas em criação, três bloqueios de agenda na semana de hoje (um de dias inteiros), preferências de horário dos pacientes e sete leads no funil (um perdido, um sem disponibilidade).",
    data: () => UNIT_MAP_DATA,
  },
  {
    id: "unit-map.saturday",
    label: "Unidade Jardim · aberta no sábado",
    description:
      "A mesma semana com a unidade aberta de segunda a sábado no cadastro, e Thiago Nunes Barreto com agenda no sábado de manhã.",
    data: () => ({
      ...UNIT_MAP_DATA,
      unit: { ...UNIT_MAP_DATA.unit, serviceHour: { ...UNIT_MAP_DATA.unit.serviceHour, weekdays: [...WEEK, 6] } },
      professionals: UNIT_MAP_DATA.professionals.map((p) =>
        p.id === "p6" ? { ...p, agenda: [...p.agenda, { weekday: 6 as Weekday, start: 8, end: 12 }] } : p,
      ),
    }),
  },
  {
    id: "unit-map.empty",
    label: "Unidade Jardim · sem agenda",
    description: "A mesma unidade sem profissionais, pacientes, salas nem agendamentos.",
    data: () => ({ ...UNIT_MAP_DATA, professionals: [], patients: [], rooms: [], schedules: [], reservedSlots: [], scheduleBlockings: [], leads: [] }),
  },
];
