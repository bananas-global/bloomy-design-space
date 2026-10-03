/**
 * Padrão de Agenda — dados sintéticos e determinísticos.
 *
 * O mapa de horas vigente do paciente fictício Lucas: os itens
 * (`HourMapAgenda`) como a aba `agenda_pattern` recebe em `@agenda_items`,
 * já com serviço, especialidade, profissional e sala resolvidos.
 */
import type { Fixture } from "@brucesantos/design-space";
import type { PatientHeader } from "../../layouts/PatientLayout.js";

export const TODAY = "02/10/2026";

/** `Bloomy.Specialties.list/0` — as que aparecem nos cartões de contagem. */
export type SpecialtySlug = "psychology" | "phonoaudiology" | "occupational_therapy" | "physiotherapy" | "music_therapy";
export type Specialty = { slug: SpecialtySlug; name: string };

export const SPECIALTIES: Specialty[] = [
  { slug: "psychology", name: "Psicologia" },
  { slug: "phonoaudiology", name: "Fonoaudiologia" },
  { slug: "occupational_therapy", name: "Terapia Ocupacional" },
  { slug: "physiotherapy", name: "Fisioterapia" },
  { slug: "music_therapy", name: "Musicoterapia" },
];

export const SERVICES: Record<SpecialtySlug, string[]> = {
  psychology: ["Sessão de Psicologia ABA"],
  phonoaudiology: ["Fonoaudiologia", "Fono - Linguagem"],
  occupational_therapy: ["Terapia Ocupacional", "Integração Sensorial"],
  physiotherapy: ["Fisioterapia Motora"],
  music_therapy: ["Musicoterapia"],
};

export const PROFESSIONALS: Record<SpecialtySlug, string[]> = {
  psychology: ["Helena Martins Costa", "Larissa Wippich", "Carina Ferreira", "Rafael Tavares"],
  phonoaudiology: ["Fábio Stoll Pereira"],
  occupational_therapy: ["Mariana Palmeira", "Tiago Alves"],
  physiotherapy: ["Raiane Almeida"],
  music_therapy: ["Camila Vasques"],
};

export const ROOMS = ["Sala Verde - 02", "Sala Azul - 01", "Sala Lúdica - 03", "Sala Sensorial - 04"];

/** `HourMapAgenda.schedule_type`. */
export type ScheduleType = "patient" | "at";

export type AgendaItem = {
  id: string;
  /** 1 = segunda … 5 = sexta. */
  weekday: number;
  /** Hora de início; cada item dura uma hora. */
  hour: number;
  specialty: SpecialtySlug;
  service: string;
  professional?: string;
  room?: string;
  scheduleType: ScheduleType;
};

export type HourMap = {
  /** dd/mm/aaaa */
  startAt: string;
  endAt: string;
  autoRenew: boolean;
  unitName: string;
  operator: string;
  maxAuthorization: number;
};

export type AgendaPatternFixture = {
  patient: PatientHeader;
  hourMap: HourMap;
  items: AgendaItem[];
  /** Abre a tela com o modal Plano Terapêutico aberto. */
  planOpen?: boolean;
};

export const PATIENT: PatientHeader = {
  name: "Lucas Almeida Ferreira",
  status: "Ativo",
  supportLevel: 2,
  restrictions: true,
  age: 8,
  unitName: "Santana",
  missedCancelledCount: 2,
  activeWeeklyHours: 24,
  observation: "Paciente sensível a sons altos.",
};

const HOUR_MAP: HourMap = {
  startAt: "01/07/2026",
  endAt: "30/09/2026",
  autoRenew: true,
  unitName: "Unidade Teste",
  operator: "Unimed",
  maxAuthorization: 60,
};

const PSI = "Sessão de Psicologia ABA";

export const ITEMS: AgendaItem[] = [
  { id: "a1", weekday: 1, hour: 8, specialty: "psychology", service: PSI, professional: "Helena Martins Costa", room: "Sala Verde - 02", scheduleType: "patient" },
  { id: "a2", weekday: 1, hour: 10, specialty: "phonoaudiology", service: "Fonoaudiologia", professional: "Fábio Stoll Pereira", room: "Sala Azul - 01", scheduleType: "patient" },
  { id: "a3", weekday: 1, hour: 14, specialty: "psychology", service: PSI, professional: "Carina Ferreira", room: "Sala Lúdica - 03", scheduleType: "at" },
  { id: "a4", weekday: 2, hour: 9, specialty: "occupational_therapy", service: "Terapia Ocupacional", professional: "Mariana Palmeira", room: "Sala Sensorial - 04", scheduleType: "patient" },
  { id: "a5", weekday: 2, hour: 11, specialty: "psychology", service: PSI, professional: "Helena Martins Costa", room: "Sala Verde - 02", scheduleType: "patient" },
  { id: "a6", weekday: 3, hour: 8, specialty: "psychology", service: PSI, professional: "Larissa Wippich", room: "Sala Verde - 02", scheduleType: "patient" },
  { id: "a7", weekday: 3, hour: 10, specialty: "physiotherapy", service: "Fisioterapia Motora", professional: "Raiane Almeida", room: "Sala Sensorial - 04", scheduleType: "patient" },
  { id: "a8", weekday: 3, hour: 15, specialty: "psychology", service: PSI, professional: "Rafael Tavares", room: "Sala Lúdica - 03", scheduleType: "at" },
  { id: "a9", weekday: 4, hour: 9, specialty: "phonoaudiology", service: "Fono - Linguagem", professional: "Fábio Stoll Pereira", room: "Sala Azul - 01", scheduleType: "patient" },
  { id: "a10", weekday: 4, hour: 13, specialty: "occupational_therapy", service: "Integração Sensorial", professional: "Tiago Alves", room: "Sala Sensorial - 04", scheduleType: "patient" },
  { id: "a11", weekday: 5, hour: 8, specialty: "psychology", service: PSI, professional: "Helena Martins Costa", room: "Sala Verde - 02", scheduleType: "patient" },
  { id: "a12", weekday: 5, hour: 8, specialty: "music_therapy", service: "Musicoterapia", professional: "Camila Vasques", room: "Sala Lúdica - 03", scheduleType: "patient" },
  { id: "a13", weekday: 5, hour: 11, specialty: "psychology", service: PSI, professional: "Carina Ferreira", room: "Sala Lúdica - 03", scheduleType: "at" },
];

/** Duas sessões ainda sem profissional: o plano mostra "A definir". */
const ITEMS_OPEN: AgendaItem[] = [
  ...ITEMS,
  { id: "a14", weekday: 2, hour: 14, specialty: "psychology", service: PSI, room: "Sala Verde - 02", scheduleType: "patient" },
  { id: "a15", weekday: 4, hour: 15, specialty: "phonoaudiology", service: "Fonoaudiologia", scheduleType: "patient" },
];

export const AGENDA_PATTERN_FIXTURES: Fixture<AgendaPatternFixture>[] = [
  {
    id: "agenda-pattern.map",
    label: "Padrão de Agenda vigente",
    description: "Treze sessões semanais em cinco especialidades.",
    data: { patient: PATIENT, hourMap: HOUR_MAP, items: ITEMS },
  },
  {
    id: "agenda-pattern.plan",
    label: "Plano Terapêutico aberto",
    description: "O mesmo mapa, com o modal Plano Terapêutico aberto.",
    data: { patient: PATIENT, hourMap: HOUR_MAP, items: ITEMS, planOpen: true },
  },
  {
    id: "agenda-pattern.plan-open-slots",
    label: "Plano Terapêutico com sessões sem profissional",
    description: "Duas sessões sem profissional definido.",
    data: { patient: PATIENT, hourMap: HOUR_MAP, items: ITEMS_OPEN, planOpen: true },
  },
];
