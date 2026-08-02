import type { Fixture } from "@brucesantos/design-space";
import type { Blocking, Room, Service, StructureData } from "../contracts/index.js";

/**
 * Fixtures da estrutura da unidade.
 *
 * A unidade Pinheiros das outras fixtures, agora pelo lado físico: quais salas
 * existem, quais serviços a clínica presta, e o que bloqueia a agenda numa
 * terça de julho.
 *
 * As três origens de bloqueio aparecem juntas de propósito: é a situação em que
 * uma mensagem única de "horário indisponível" mais engana.
 */

const NOW = "2026-07-30T09:00:00.000-03:00";
const UNIDADE = { id: "un-pinheiros", name: "Pinheiros" };

const SALAS: Room[] = [
  {
    id: "sala-1",
    name: "Sala 1",
    number: 1,
    roomType: "individual",
    capacity: 2,
    active: true,
    areaName: "Térreo",
  },
  {
    id: "sala-2",
    name: "Sala 2",
    number: 2,
    roomType: "individual",
    capacity: 2,
    active: true,
    areaName: "Térreo",
  },
  {
    id: "sala-3",
    name: "Sala de grupo",
    number: 3,
    roomType: "collective",
    capacity: 6,
    active: true,
    areaName: "Primeiro andar",
  },
  {
    id: "sala-4",
    name: "Sala de motricidade",
    number: 4,
    roomType: "motricity",
    capacity: 4,
    active: false,
    deactivationDate: "2026-07-14",
    areaName: "Primeiro andar",
  },
];

const SERVICOS: Service[] = [
  {
    id: "srv-aba",
    name: "Terapia ABA — individual",
    tussCode: "50000276",
    durationInMinutes: 60,
    needsRoom: true,
    roomTypes: ["individual"],
    notChargeable: false,
    specialty: "Aplicador ABA",
  },
  {
    id: "srv-grupo",
    name: "Habilidades sociais em grupo",
    tussCode: "50000284",
    durationInMinutes: 60,
    needsRoom: true,
    roomTypes: ["collective"],
    notChargeable: false,
    specialty: "Psicologia",
  },
  {
    id: "srv-psicomotricidade",
    name: "Psicomotricidade",
    tussCode: "50000292",
    durationInMinutes: 45,
    needsRoom: true,
    // A única sala de motricidade da unidade está inativa desde 14/07.
    roomTypes: ["motricity"],
    notChargeable: false,
    specialty: "Psicomotricidade",
  },
  {
    id: "srv-devolutiva",
    name: "Devolutiva à família",
    durationInMinutes: 60,
    needsRoom: false,
    roomTypes: [],
    // É este campo que dispensa o check-in no módulo de Atendimento.
    notChargeable: true,
    specialty: "Psicologia",
  },
  {
    id: "srv-contraditorio",
    name: "Avaliação em ambiente estruturado",
    durationInMinutes: 90,
    // Exige sala e não declara nenhum tipo: impossível de agendar.
    needsRoom: true,
    roomTypes: [],
    notChargeable: false,
  },
];

const BLOQUEIOS: Blocking[] = [
  {
    id: "blk-1",
    scope: "general",
    blockingType: "slot",
    start: "2026-07-09T00:00:00.000-03:00",
    end: "2026-07-10T00:00:00.000-03:00",
    isHoliday: true,
    holidayName: "Revolução Constitucionalista",
  },
  {
    id: "blk-2",
    scope: "unit",
    blockingType: "time_period",
    start: "2026-07-30T12:00:00.000-03:00",
    end: "2026-07-30T14:00:00.000-03:00",
    observation: "Unidade fechada para almoço",
    isHoliday: false,
  },
  {
    id: "blk-3",
    scope: "professional",
    blockingType: "time_period",
    start: "2026-07-27T00:00:00.000-03:00",
    end: "2026-08-04T00:00:00.000-03:00",
    observation: "Marina Okabe em férias",
    isHoliday: false,
    professionalName: "Marina Okabe",
  },
  {
    id: "blk-4",
    scope: "professional",
    blockingType: "slot",
    start: "2026-07-30T16:00:00.000-03:00",
    end: "2026-07-30T17:00:00.000-03:00",
    observation: "Clara Vidigal em reunião clínica",
    isHoliday: false,
    professionalName: "Clara Vidigal",
  },
];

function structure(overrides: Partial<StructureData> = {}): StructureData {
  return {
    unit: UNIDADE,
    rooms: SALAS,
    services: SERVICOS,
    blockings: BLOQUEIOS,
    now: NOW,
    ...overrides,
  };
}

export const structureFixtures: Fixture<StructureData>[] = [
  {
    id: "structure-unit",
    label: "Estrutura da unidade",
    description:
      "Quatro salas, cinco serviços e as três origens de bloqueio convivendo numa terça de julho.",
    data: structure(),
  },
  {
    id: "structure-no-room-for-service",
    label: "Serviço sem sala disponível",
    description:
      "Psicomotricidade precisa de sala de motricidade, e a única da unidade está inativa desde 14/07.",
    data: structure(),
  },
  {
    id: "structure-impossible-service",
    label: "Serviço impossível de agendar",
    description:
      "Exige sala e não declara nenhum tipo aceito. O cadastro aceita, e a recepção descobre ao tentar usar.",
    data: structure(),
  },
  {
    id: "structure-blockings",
    label: "Três origens de bloqueio",
    description:
      "Feriado, unidade fechada para almoço e duas ausências de profissional — cada uma com uma saída diferente.",
    data: structure(),
  },
  {
    id: "structure-empty",
    label: "Unidade sem estrutura cadastrada",
    description: "Unidade recém-aberta: nenhuma sala, nenhum serviço, nenhum bloqueio.",
    data: structure({ rooms: [], services: [], blockings: [] }),
  },
];

export const structureIds = {
  aba: "srv-aba",
  psicomotricidade: "srv-psicomotricidade",
  contraditorio: "srv-contraditorio",
  devolutiva: "srv-devolutiva",
} as const;
