/**
 * Padrão de Agenda — dados sintéticos. Paciente, profissionais e salas são
 * fictícios. As três vigências e os treze atendimentos do protótipo.
 */
import type { Fixture } from "@brucesantos/design-space";
import type { PatientHeader } from "../../layouts/PatientLayout.js";
import { SERVICES, type AgendaItem, type SpecSlug, type Vigencia } from "./model.js";

export type AgendaFixture = {
  patient: PatientHeader;
  vigencias: Vigencia[];
  /** A vigência que a tela abre. */
  current: string;
  /** Os atendimentos de cada vigência. */
  items: Record<string, AgendaItem[]>;
  /** Horários preferenciais da família, por dia da semana (1 = segunda). */
  pref: Record<number, number[]>;
};

const it = (id: string, weekday: number, hour: number, slug: SpecSlug, professional: string, room: string, type: AgendaItem["type"] = "patient", service?: string): AgendaItem =>
  ({ id, weekday, hour, slug, service: service ?? SERVICES[slug][0]!, professional, room, location: "in_clinic", type });

const ITEMS: AgendaItem[] = [
  it("a1", 1, 8, "psychology", "Helena Martins Costa", "Sala Verde - 02"),
  it("a2", 1, 10, "phonoaudiology", "Fábio Stoll Pereira", "Sala Azul - 01"),
  it("a3", 1, 14, "psychology", "Carina Ferreira", "Sala Lúdica - 03", "at"),
  it("a4", 2, 9, "occupational_therapy", "Mariana Palmeira", "Sala Sensorial - 04"),
  it("a5", 2, 11, "psychology", "Helena Martins Costa", "Sala Verde - 02"),
  it("a6", 3, 8, "psychology", "Larissa Wippich", "Sala Verde - 02"),
  it("a7", 3, 10, "physiotherapy", "Raiane Almeida", "Sala Sensorial - 04"),
  it("a8", 3, 15, "psychology", "Rafael Tavares", "Sala Lúdica - 03", "at"),
  it("a9", 4, 9, "phonoaudiology", "Fábio Stoll Pereira", "Sala Azul - 01", "patient", "Fono - Linguagem"),
  it("a10", 4, 13, "occupational_therapy", "Tiago Alves", "Sala Sensorial - 04", "patient", "Integração Sensorial"),
  it("a11", 5, 8, "psychology", "Helena Martins Costa", "Sala Verde - 02"),
  it("a12", 5, 9, "music_therapy", "Camila Vasques", "Sala Lúdica - 03"),
  it("a13", 5, 11, "psychology", "Carina Ferreira", "Sala Lúdica - 03", "at"),
];

const VIGENCIAS: Vigencia[] = [
  { id: "v0", start: "2026-07-01", end: "2026-09-30", autoRenew: true },
  { id: "v1", start: "2026-10-01", end: "2026-12-31", autoRenew: true },
  { id: "v2", start: "2027-01-01", end: "2027-03-31", autoRenew: true },
];

const PATIENT: PatientHeader = {
  name: "Lucas Andrade Ferreira",
  status: "Ativo",
  supportLevel: 2,
  age: 7,
  unitName: "Unidade Jardim",
  missedCancelledCount: 1,
  activeWeeklyHours: 13,
};

const PREF = { 1: [8, 9, 10, 11], 2: [14, 15, 16], 3: [8, 9, 10, 11], 4: [14, 15, 16], 5: [8, 9, 10] };

export const AGENDA_FIXTURES: Fixture<AgendaFixture>[] = [
  {
    id: "agenda.base",
    label: "Padrão com atendimentos",
    description: "Lucas, 13h semanais em cinco especialidades, com três vigências: encerrada, em vigência e futura.",
    data: {
      patient: PATIENT,
      vigencias: VIGENCIAS,
      current: "v1",
      items: { v0: ITEMS, v1: ITEMS, v2: ITEMS },
      pref: PREF,
    },
  },
  {
    id: "agenda.vazio",
    label: "Padrão vazio",
    description: "Paciente recém-admitido: uma vigência em andamento e nenhum atendimento no padrão.",
    data: {
      patient: { ...PATIENT, activeWeeklyHours: 0 },
      vigencias: [VIGENCIAS[1]!],
      current: "v1",
      items: { v1: [] },
      pref: PREF,
    },
  },
];
