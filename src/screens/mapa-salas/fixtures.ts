/**
 * Mapa de Salas — dados sintéticos e determinísticos.
 *
 * As duas unidades do protótipo (`UNITS_DATA`): a Unidade Teste, com três
 * áreas e onze salas, e Santana, com três salas. Cada ponto de atendimento
 * traz o planejamento (`plan`, o que a unidade precisa) e a escala (`periods`,
 * quem está alocado). Hoje é `TODAY` (30/07/2026). Nomes são fictícios.
 *
 * `PROFESSIONALS` dá a especialidade e as datas de desligamento que o mapa
 * consulta.
 */
import type { Fixture } from "@brucesantos/design-space";
import type { UnitHeader } from "../../layouts/UnitLayout.js";
import type { DayKey, Room, RoomBlocking, ServiceHour, Specialty } from "./model.js";

export type UnitId = "u1" | "u2";

export type MapUnit = {
  id: UnitId;
  name: string;
  phone: string;
  address: UnitHeader["address"];
  serviceHour: ServiceHour;
  areas: { id: string; name: string }[];
  rooms: Room[];
  roomBlockings: RoomBlocking[];
};

export type RoomsMapFixture = { units: MapUnit[] };

const WEEK: DayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

export const UNITS: MapUnit[] = [
  {
    id: "u1",
    name: "Unidade Teste",
    phone: "(11) 3255-8890",
    address: { street: "Av. Paulista", number: "1578", neighborhood: "Bela Vista", city: "São Paulo", state: "SP" },
    serviceHour: { weekdays: WEEK, start: "08:00", end: "18:00" },
    areas: [
      { id: "ar1", name: "Térreo" },
      { id: "ar2", name: "1º Andar" },
      { id: "ar3", name: "Ala Lúdica" },
    ],
    rooms: [
      { id: "r1", number: 1, name: "Sala Azul", areaId: "ar1", type: "attendance", capacity: 4, active: true, servicePoints: [
        { name: "A",
          plan: [{ start: "08:00", end: "12:00", specialty: "Psicologia", role: "therapeutic_companion", planType: "fixed", days: WEEK }],
          periods: [{ start: "08:00", end: "12:00", specialty: "Psicologia", role: "therapeutic_companion", type: "default", professional: "Helena Martins Costa", days: WEEK }] },
        { name: "B",
          plan: [{ start: "13:00", end: "17:00", specialty: "Fonoaudiologia", role: "applicator", planType: "fixed", days: WEEK }],
          periods: [
            { start: "13:00", end: "17:00", specialty: "Psicologia", role: "applicator", type: "temporary", professional: "Larissa Wippich Faria", days: ["monday", "wednesday", "friday"] },
            { start: "13:00", end: "16:00", specialty: "Psicopedagogia", role: "specialist", professional: "Lívia Cardoso da Mata", days: ["tuesday", "thursday"], validFrom: "2026-08-17" },
          ] },
      ] },
      { id: "r2", number: 2, name: "Sala Verde", areaId: "ar1", type: "attendance", capacity: 2, active: true, servicePoints: [
        { name: "A",
          plan: [{ start: "08:00", end: "12:00", specialty: "Terapia Ocupacional", role: "therapeutic_companion", planType: "fixed", days: WEEK }],
          periods: [{ start: "08:00", end: "11:00", specialty: "Terapia Ocupacional", role: "therapeutic_companion", type: "default", professional: "Mariana Palmeira Stein", days: ["monday", "tuesday", "wednesday", "thursday"] }] },
      ] },
      { id: "r3", number: 3, name: "Sala Amarela", areaId: "ar2", type: "evaluation", capacity: 3, active: true, servicePoints: [
        { name: "A",
          plan: [{ start: "14:00", end: "18:00", specialty: "Fonoaudiologia", role: "specialist", planType: "temporary", days: WEEK }],
          periods: [] },
      ] },
      { id: "r9", number: 6, name: "Sala Lilás", areaId: "ar1", type: "attendance", capacity: 4, active: true, servicePoints: [
        { name: "A",
          plan: [{ start: "08:00", end: "12:00", specialty: "Fonoaudiologia", role: "specialist", planType: "fixed", days: WEEK }],
          periods: [{ start: "08:00", end: "12:00", specialty: "Fonoaudiologia", role: "specialist", type: "default", professional: "Fábio Stoll Pereira", days: WEEK }] },
        { name: "B",
          plan: [{ start: "13:00", end: "17:00", specialty: "Fonoaudiologia", role: "applicator", planType: "fixed", days: WEEK }],
          periods: [] },
        { name: "C",
          plan: [{ start: "08:00", end: "12:00", specialty: "Terapia Ocupacional", role: "therapeutic_companion", planType: "fixed", days: WEEK }],
          periods: [{ start: "08:00", end: "12:00", specialty: "Terapia Ocupacional", role: "therapeutic_companion", type: "default", professional: "Tiago Alves da Rocha", days: ["tuesday", "thursday"] }] },
        { name: "D", plan: [], periods: [] },
      ] },
      { id: "r10", number: 7, name: "Sala Rosa", areaId: "ar2", type: "attendance", capacity: 3, active: true, servicePoints: [
        { name: "A",
          plan: [
            { start: "08:00", end: "12:00", specialty: "Psicologia", role: "therapeutic_companion", planType: "fixed", days: WEEK },
            { start: "13:00", end: "17:00", specialty: "Psicologia", role: "applicator", planType: "fixed", days: WEEK },
          ],
          periods: [{ start: "13:00", end: "17:00", specialty: "Psicologia", role: "applicator", type: "default", professional: "Tânia Abreu Pinho", days: ["monday", "wednesday", "friday"] }] },
        { name: "B",
          plan: [{ start: "13:00", end: "17:00", specialty: "Psicopedagogia", role: "specialist", planType: "fixed", days: WEEK }],
          periods: [{ start: "13:00", end: "17:00", specialty: "Terapia Ocupacional", role: "specialist", type: "default", professional: "Mariana Palmeira Stein", days: ["monday", "tuesday", "wednesday"] }] },
        { name: "C", plan: [], periods: [] },
      ] },
      { id: "r11", number: 8, name: "Sala Laranja", areaId: "ar2", type: "attendance", capacity: 2, active: true, servicePoints: [
        { name: "A",
          plan: [
            { start: "08:00", end: "12:00", specialty: "Aplicador ABA", role: "applicator", planType: "fixed", days: WEEK },
            { start: "13:00", end: "18:00", specialty: "Aplicador ABA", role: "applicator", planType: "temporary", days: WEEK },
          ],
          periods: [] },
        { name: "B",
          plan: [{ start: "14:00", end: "18:00", specialty: "Fisioterapia", role: "therapeutic_companion", planType: "fixed", days: WEEK }],
          periods: [{ start: "14:00", end: "18:00", specialty: "Psicologia", role: "therapeutic_companion", type: "default", professional: "Helena Martins Costa", days: ["monday", "tuesday", "wednesday", "thursday"] }] },
      ] },
      { id: "r12", number: 9, name: "Consultório 1", areaId: "ar3", type: "attendance", capacity: 2, active: true, servicePoints: [
        { name: "A", plan: [],
          periods: [{ start: "08:00", end: "11:00", specialty: "Psicopedagogia", role: "specialist", type: "default", professional: "Lívia Cardoso da Mata", days: ["monday", "wednesday"] }] },
      ] },
      { id: "r13", number: 10, name: "Consultório 2", areaId: "ar3", type: "attendance", capacity: 2, active: true, servicePoints: [
        { name: "A", plan: [], periods: [] },
        { name: "B", plan: [], periods: [] },
      ] },
      { id: "r14", number: 11, name: "Sala Integração", areaId: "ar3", type: "attendance", capacity: 6, active: true, servicePoints: [
        { name: "A",
          plan: [{ start: "08:00", end: "18:00", specialty: "Terapia Ocupacional", role: "specialist", planType: "fixed", days: WEEK }],
          periods: [{ start: "13:00", end: "18:00", specialty: "Terapia Ocupacional", role: "therapeutic_companion", type: "default", professional: "Tiago Alves da Rocha", days: ["monday", "wednesday", "friday"] }] },
        { name: "B",
          plan: [{ start: "08:00", end: "12:00", specialty: "Fonoaudiologia", role: "applicator", planType: "fixed", days: WEEK }],
          periods: [] },
        { name: "C",
          plan: [{ start: "13:00", end: "17:00", specialty: "Psicologia", role: "applicator", planType: "fixed", days: WEEK }],
          periods: [{ start: "13:00", end: "17:00", specialty: "Fonoaudiologia", role: "applicator", type: "default", professional: "Larissa Wippich Faria", days: ["tuesday", "thursday"] }] },
        { name: "D", plan: [], periods: [] },
        { name: "E",
          plan: [{ start: "10:00", end: "12:00", specialty: "Fisioterapia", role: "therapeutic_companion", planType: "temporary", days: ["monday", "wednesday", "friday"] }],
          periods: [] },
      ] },
      { id: "r4", number: 4, name: "Sala de Espera", areaId: "ar2", type: "waiting", capacity: 8, active: true, servicePoints: [] },
      { id: "r5", number: 5, name: "Ludoteca", areaId: "ar3", type: "playful", capacity: 6, active: false, servicePoints: [] },
    ],
    roomBlockings: [
      { id: "rb1", room: "Sala Azul", number: 1, name: "Pintura", type: "time_period", start: "10/03/2026", end: "11/03/2026", obs: "Sala interditada para pintura." },
      { id: "rb2", room: "Sala Amarela", number: 3, name: "Reparo AC", type: "slot", start: "05/03/2026 13:00", end: "05/03/2026 18:00", obs: "Ar-condicionado em reparo." },
    ],
  },
  {
    id: "u2",
    name: "Santana",
    phone: "(11) 2098-4471",
    address: { street: "Rua Voluntários da Pátria", number: "2044", neighborhood: "Santana", city: "São Paulo", state: "SP" },
    serviceHour: { weekdays: [...WEEK, "saturday"], start: "07:30", end: "19:00" },
    areas: [
      { id: "ar4", name: "Bloco A" },
      { id: "ar5", name: "Bloco B" },
    ],
    rooms: [
      { id: "r6", number: 1, name: "Sala 101", areaId: "ar4", type: "attendance", capacity: 3, active: true, servicePoints: [
        { name: "A",
          plan: [{ start: "07:30", end: "11:30", specialty: "Fisioterapia", role: "therapeutic_companion", planType: "fixed", days: WEEK }],
          periods: [
            { start: "07:30", end: "11:30", specialty: "Fisioterapia", role: "therapeutic_companion", type: "default", professional: "Lucinara Rodrigues Lima", days: ["monday", "wednesday", "friday"] },
            { start: "07:30", end: "11:30", specialty: "Psicologia", role: "applicator", professional: "Tânia Abreu Pinho", days: ["tuesday", "thursday"] },
          ] },
        { name: "B",
          plan: [
            { start: "08:00", end: "12:00", specialty: "Fonoaudiologia", role: "applicator", planType: "fixed", days: WEEK },
            { start: "14:00", end: "18:00", specialty: "Fonoaudiologia", role: "applicator", planType: "temporary", days: WEEK },
          ],
          periods: [
            { start: "08:00", end: "12:00", specialty: "Fonoaudiologia", role: "applicator", type: "default", professional: "Larissa Wippich Faria", days: WEEK },
            { start: "14:00", end: "19:00", specialty: "Fonoaudiologia", role: "applicator", type: "temporary", professional: "Fábio Stoll Pereira", days: ["monday", "tuesday", "wednesday", "thursday"], validUntil: "2026-08-21" },
          ] },
      ] },
      { id: "r7", number: 2, name: "Sala 102", areaId: "ar4", type: "attendance", capacity: 2, active: true, servicePoints: [] },
      { id: "r8", number: 3, name: "Sala 201", areaId: "ar5", type: "evaluation", capacity: 4, active: true, servicePoints: [
        { name: "A",
          plan: [
            { start: "08:00", end: "12:00", specialty: "Terapia Ocupacional", role: "specialist", planType: "fixed", days: ["monday", "tuesday", "wednesday"] },
            { start: "13:00", end: "18:00", specialty: "Psicologia", role: "supervisor", planType: "fixed", days: WEEK },
          ],
          periods: [
            { start: "13:00", end: "18:00", specialty: "Psicologia", role: "supervisor", type: "default", professional: "Rafael Andrade Nunes", days: WEEK },
          ] },
      ] },
    ],
    roomBlockings: [],
  },
];

export const unitById = (id: string) => UNITS.find((u) => u.id === id) ?? UNITS[0]!;

/**
 * Profissionais (recorte de `professionals-list`): só o que o mapa consulta.
 * `deactivationAt` no futuro = em inativação; o período some do mapa depois
 * dessa data.
 */
export type Professional = { name: string; active: boolean; specialty: Specialty | string; deactivationAt?: string };

export const PROFESSIONALS: Professional[] = [
  { name: "Helena Martins Costa", active: true, specialty: "Psicologia" },
  { name: "Tânia Abreu Pinho", active: true, specialty: "Psicologia", deactivationAt: "2026-08-12" },
  { name: "Mariana Palmeira Stein", active: true, specialty: "Terapia Ocupacional" },
  { name: "Tiago Alves da Rocha", active: true, specialty: "Terapia Ocupacional" },
  { name: "Lívia Cardoso da Mata", active: true, specialty: "Psicopedagogia" },
  { name: "Larissa Wippich Faria", active: true, specialty: "Psicologia" },
  { name: "Raiane Almeida Longo", active: true, specialty: "Fisioterapia" },
  { name: "Lucinara Rodrigues Lima", active: true, specialty: "Fisioterapia", deactivationAt: "2026-08-31" },
  { name: "Fábio Stoll Pereira", active: true, specialty: "Fonoaudiologia" },
  { name: "Carina Ferreira de Araújo", active: false, specialty: "Aplicador Psicologia" },
  // Disponíveis para troca: sem alocação no mapa.
  { name: "Beatriz Nogueira Sales", active: true, specialty: "Fonoaudiologia" },
  { name: "Renato Kaminski Duarte", active: true, specialty: "Fonoaudiologia" },
  { name: "Juliana Prado Motta", active: true, specialty: "Fonoaudiologia" },
  { name: "Camila Ribeiro Torres", active: true, specialty: "Psicologia" },
  { name: "Gustavo Henrique Lessa", active: true, specialty: "Psicologia" },
  { name: "Paula Menezes Vidal", active: true, specialty: "Psicologia" },
  { name: "André Luiz Fontana", active: true, specialty: "Terapia Ocupacional" },
  { name: "Natália Brito Siqueira", active: true, specialty: "Terapia Ocupacional" },
  { name: "Débora Assis Quintela", active: true, specialty: "Psicopedagogia" },
  { name: "Marcelo Viana Torquato", active: true, specialty: "Psicopedagogia" },
  { name: "Isabela Couto Farias", active: true, specialty: "Fisioterapia" },
  { name: "Rodrigo Pessoa Amaral", active: true, specialty: "Fisioterapia" },
  { name: "Letícia Barros Maia", active: true, specialty: "Aplicador ABA" },
  { name: "Vinícius Moraes Tavares", active: true, specialty: "Aplicador ABA" },
  { name: "Sofia Lacerda Ramos", active: true, specialty: "Aplicador ABA" },
];

export const ROOMS_MAP_FIXTURES: Fixture<RoomsMapFixture>[] = [
  {
    id: "rooms-map.units",
    label: "Unidade Teste e Santana · salas do protótipo",
    description:
      "Unidade Teste com onze salas em três áreas (duas sem atendimento) e Santana com três. Cada ponto tem o planejamento e a escala; há trechos a cobrir, conflitos de especialidade, escala sem plano e escala temporária.",
    data: () => ({ units: UNITS }),
  },
];
