import type { Fixture } from "@brucesantos/design-space";
import type { Prospect, ProspectsData } from "../contracts/index.js";

/**
 * Fixtures do funil de visitas.
 *
 * Seis famílias em pontos diferentes do funil, incluindo duas perdidas em
 * passos distintos — que é o que torna visível onde o processo perde gente.
 *
 * Uma delas está parada há dois meses no mesmo passo. Numa lista por estágio,
 * ela é idêntica a quem chegou ontem.
 */

const NOW = "2026-07-30T09:00:00.000-03:00";

function prospect(overrides: Partial<Prospect> & { id: string }): Prospect {
  return {
    childName: "Criança",
    guardianName: "Responsável",
    step: "new",
    source: "search",
    unitOfInterest: "Pinheiros",
    specialties: ["Aplicador ABA"],
    visits: [],
    availability: [],
    history: [],
    active: true,
    ...overrides,
  };
}

const PROSPECTS: Prospect[] = [
  prospect({
    id: "pr-1",
    childName: "Alice Ferraz Nunes",
    guardianName: "Camila Ferraz",
    guardianPhone: "(11) 90000-0101",
    guardianEmail: "camila.ferraz@exemplo.test",
    step: "new",
    source: "indication",
    observation: "Indicada pela neuropediatra do Hospital Infantil.",
    history: [
      { at: "2026-07-28T10:00:00.000-03:00", from: "new", to: "new", by: "Helena Braga" },
    ],
  }),
  prospect({
    id: "pr-2",
    childName: "Bento Aquino Rosa",
    guardianName: "Diego Aquino",
    guardianPhone: "(11) 90000-0102",
    guardianCpf: "529.982.247-25",
    step: "in_avaliation",
    source: "search",
    specialties: ["Aplicador ABA", "Fonoaudiologia"],
    visits: [
      {
        id: "v-1",
        date: "2026-07-15",
        visitedBy: "Helena Braga",
        observations:
          "Pai veio sozinho conhecer a unidade. Achou o espaço adequado e pediu proposta.",
      },
    ],
    availability: [
      { weekday: 2, startAt: "14:00", endAt: "18:00" },
      { weekday: 4, startAt: "14:00", endAt: "18:00" },
    ],
    history: [
      { at: "2026-07-10T09:00:00.000-03:00", from: "new", to: "initial_contact", by: "Helena Braga" },
      { at: "2026-07-15T16:00:00.000-03:00", from: "initial_contact", to: "in_avaliation", by: "Clara Vidigal" },
    ],
  }),
  // Parada há dois meses: numa lista por estágio é igual a quem chegou ontem.
  prospect({
    id: "pr-3",
    childName: "Cecília Mainardi",
    guardianName: "Paula Mainardi",
    guardianPhone: "(11) 90000-0103",
    step: "waiting_plan",
    source: "indication",
    availability: [{ weekday: 3, startAt: "08:00", endAt: "12:00" }],
    history: [
      { at: "2026-04-20T09:00:00.000-03:00", from: "new", to: "initial_contact", by: "Helena Braga" },
      { at: "2026-05-06T14:00:00.000-03:00", from: "initial_contact", to: "submitted", by: "Helena Braga" },
      { at: "2026-05-20T11:00:00.000-03:00", from: "submitted", to: "waiting_plan", by: "Denise Portela" },
    ],
  }),
  prospect({
    id: "pr-4",
    childName: "Davi Loureiro Pinto",
    guardianName: "Sandra Loureiro",
    guardianPhone: "(11) 90000-0104",
    guardianEmail: "sandra.loureiro@exemplo.test",
    guardianCpf: "111.444.777-35",
    step: "scheduled",
    source: "indication",
    availability: [
      { weekday: 1, startAt: "09:00", endAt: "12:00" },
      { weekday: 5, startAt: "09:00", endAt: "12:00" },
    ],
    history: [
      { at: "2026-07-01T09:00:00.000-03:00", from: "new", to: "initial_contact", by: "Helena Braga" },
      { at: "2026-07-08T10:00:00.000-03:00", from: "initial_contact", to: "in_avaliation", by: "Clara Vidigal" },
      { at: "2026-07-18T15:00:00.000-03:00", from: "in_avaliation", to: "submitted", by: "Helena Braga" },
      { at: "2026-07-24T11:00:00.000-03:00", from: "submitted", to: "scheduled", by: "Helena Braga" },
    ],
  }),
  // Perdido na avaliação.
  prospect({
    id: "pr-5",
    childName: "Elisa Vasques",
    guardianName: "Roberto Vasques",
    step: "lost",
    source: "search",
    observation: "Família optou por clínica mais perto de casa.",
    history: [
      { at: "2026-06-02T09:00:00.000-03:00", from: "new", to: "initial_contact", by: "Helena Braga" },
      { at: "2026-06-09T14:00:00.000-03:00", from: "initial_contact", to: "in_avaliation", by: "Clara Vidigal" },
      { at: "2026-06-25T10:00:00.000-03:00", from: "in_avaliation", to: "lost", by: "Helena Braga" },
    ],
  }),
  // Perdido depois da proposta — outro ponto de perda.
  prospect({
    id: "pr-6",
    childName: "Felipe Andrade Cruz",
    guardianName: "Marta Cruz",
    step: "lost",
    source: "others",
    observation: "Convênio não cobria a frequência proposta.",
    history: [
      { at: "2026-05-12T09:00:00.000-03:00", from: "new", to: "initial_contact", by: "Helena Braga" },
      { at: "2026-05-28T14:00:00.000-03:00", from: "initial_contact", to: "submitted", by: "Helena Braga" },
      { at: "2026-06-10T16:00:00.000-03:00", from: "submitted", to: "lost", by: "Denise Portela" },
    ],
  }),
];

export const prospectFixtures: Fixture<ProspectsData>[] = [
  {
    id: "prospects-funnel",
    label: "O funil de julho",
    description:
      "Seis famílias, duas perdidas em passos diferentes e uma parada há dois meses em aguardando plano.",
    data: { prospects: PROSPECTS, now: NOW },
  },
  {
    id: "prospects-ready-to-convert",
    label: "Pronto para converter",
    description:
      "Primeira sessão marcada, com disponibilidade declarada. Converter ainda pede cinco dados que a visita não coleta.",
    data: { prospects: [PROSPECTS[3]!], now: NOW },
  },
  {
    id: "prospects-no-availability",
    label: "Sem disponibilidade declarada",
    description:
      "Avançou no funil e não tem nenhuma janela anotada. Trava na hora de marcar a primeira sessão.",
    data: { prospects: [PROSPECTS[0]!], now: NOW },
  },
  {
    id: "prospects-stalled",
    label: "Parado há dois meses",
    description:
      "Aguardando plano desde 20 de maio. Numa lista por estágio, é idêntico a quem chegou ontem.",
    data: { prospects: [PROSPECTS[2]!], now: NOW },
  },
  {
    id: "prospects-empty",
    label: "Nenhuma visita registrada",
    description: "Unidade recém-aberta, ou semana sem contato novo.",
    data: { prospects: [], now: NOW },
  },
];
