import type { Fixture } from "@brucesantos/design-space";
import type { UnitMapData, UnitMapDay, UnitMapRow } from "../contracts/index.js";

/**
 * Fixtures do mapa da unidade.
 *
 * A unidade fecha às 18h30 de propósito: é o que faz a faixa das 18h existir e
 * sumir do mapa, reproduzindo `end_at.hour - 1`. E uma profissional aparece sem
 * nenhuma hora de agenda padrão — é ela que o sistema real mostra como "0% de
 * ocupação", igual a quem tem o dia inteiro livre.
 */

const SEMANA = { start: "2026-07-27", end: "2026-07-31" };
const DIAS = [
  { date: "2026-07-27", weekdayName: "Segunda" },
  { date: "2026-07-28", weekdayName: "Terça" },
  { date: "2026-07-29", weekdayName: "Quarta" },
  { date: "2026-07-30", weekdayName: "Quinta" },
  { date: "2026-07-31", weekdayName: "Sexta" },
];

const MANHA_E_TARDE = [8, 9, 10, 11, 14, 15, 16, 17];

function item(id: string, patientName: string, serviceName = "Sessão de intervenção ABA") {
  return { id, patientName, serviceName, status: "scheduled" as const };
}

function day(
  index: number,
  availableHours: number[],
  itemsByHour: UnitMapDay["itemsByHour"] = {},
): UnitMapDay {
  return { ...DIAS[index]!, availableHours, itemsByHour };
}

/** Agenda cheia e boa parte ocupada — a linha normal. */
const MARINA: UnitMapRow = {
  id: "prof-marina",
  name: "Marina Okabe",
  subtitle: "Fonoaudiologia",
  days: [
    day(0, MANHA_E_TARDE, {
      8: [item("a1", "Théo Andrade Lins")],
      9: [item("a2", "Helena Vasconcelos Prado")],
      14: [item("a3", "Nina Corrêa Bastos")],
      15: [item("a4", "Théo Andrade Lins")],
    }),
    day(1, MANHA_E_TARDE, {
      8: [item("b1", "Nina Corrêa Bastos")],
      14: [item("b2", "Helena Vasconcelos Prado")],
    }),
    day(2, MANHA_E_TARDE, {
      9: [item("c1", "Théo Andrade Lins")],
      10: [item("c2", "Nina Corrêa Bastos")],
      11: [item("c3", "Helena Vasconcelos Prado")],
      14: [item("c4", "Théo Andrade Lins")],
      15: [item("c5", "Nina Corrêa Bastos")],
      16: [item("c6", "Helena Vasconcelos Prado")],
    }),
    day(3, MANHA_E_TARDE, { 8: [item("d1", "Théo Andrade Lins")] }),
    day(4, MANHA_E_TARDE, {}),
  ],
};

/** Nenhuma hora de agenda padrão em dia nenhum. É a linha que o sistema real achata em 0%. */
const IARA: UnitMapRow = {
  id: "prof-iara",
  name: "Iara Monteiro Sales",
  subtitle: "Psicologia",
  days: [day(0, []), day(1, []), day(2, []), day(3, []), day(4, [])],
};

/** Agenda definida e semana vazia — o outro zero, que pede a ação oposta. */
const RENATO: UnitMapRow = {
  id: "prof-renato",
  name: "Renato Bezerra Alcântara",
  subtitle: "Terapia ocupacional",
  days: [day(0, MANHA_E_TARDE), day(1, MANHA_E_TARDE), day(2, MANHA_E_TARDE), day(3, MANHA_E_TARDE), day(4, MANHA_E_TARDE)],
};

const UNIDADE = { name: "Unidade Pinheiros", opensAt: "08:00", closesAt: "18:30" };

export const unitMapFixtures: Fixture[] = [
  {
    id: "unit-map-week",
    label: "A semana por profissional",
    description:
      "Três profissionais na mesma semana: uma com agenda cheia, uma sem agenda nenhuma e um com agenda vazia. Os dois últimos são zeros diferentes.",
    data: {
      unit: UNIDADE,
      axis: "professional",
      granularity: "week",
      week: SEMANA,
      rows: [MARINA, IARA, RENATO],
    } satisfies UnitMapData,
  },
  {
    id: "unit-map-lost-hour",
    label: "O atendimento das 18h, que o mapa não mostra",
    description:
      "A unidade fecha às 18h30 e o mapa vai até as 17h. Dois atendimentos existem na faixa perdida.",
    data: {
      unit: UNIDADE,
      axis: "professional",
      granularity: "week",
      week: SEMANA,
      rows: [
        {
          ...MARINA,
          days: [
            day(0, [...MANHA_E_TARDE, 18], {
              8: [item("a1", "Théo Andrade Lins")],
              18: [item("a9", "Nina Corrêa Bastos", "Acompanhamento terapêutico")],
            }),
            day(1, [...MANHA_E_TARDE, 18], {
              18: [item("b9", "Helena Vasconcelos Prado")],
            }),
            day(2, MANHA_E_TARDE, {}),
            day(3, MANHA_E_TARDE, {}),
            day(4, MANHA_E_TARDE, {}),
          ],
        },
      ],
    } satisfies UnitMapData,
  },
  {
    id: "unit-map-crowded-hour",
    label: "Uma hora com três atendimentos conta como uma",
    description:
      "Quarta às 14h tem três atendimentos em salas diferentes. A ocupação conta uma hora tomada, e não três.",
    data: {
      unit: UNIDADE,
      axis: "room",
      granularity: "week",
      week: SEMANA,
      rows: [
        {
          id: "sala-girassol",
          name: "Girassol 2",
          subtitle: "Sala de intervenção",
          days: [
            day(0, MANHA_E_TARDE, { 8: [item("r1", "Théo Andrade Lins")] }),
            day(1, MANHA_E_TARDE, {}),
            day(2, MANHA_E_TARDE, {
              14: [
                item("r2", "Théo Andrade Lins"),
                item("r3", "Helena Vasconcelos Prado"),
                item("r4", "Nina Corrêa Bastos"),
              ],
            }),
            day(3, MANHA_E_TARDE, {}),
            day(4, MANHA_E_TARDE, {}),
          ],
        },
      ],
    } satisfies UnitMapData,
  },
  {
    id: "unit-map-by-patient",
    label: "A semana do paciente, sem escolha de granularidade",
    description:
      "No eixo do paciente a granularidade é fixa em semana — e a tela diz por quê, em vez de apagar dois botões.",
    data: {
      unit: UNIDADE,
      axis: "patient",
      granularity: "week",
      week: SEMANA,
      rows: [
        {
          id: "pac-theo",
          name: "Théo Andrade Lins",
          subtitle: "6 anos",
          days: [
            day(0, MANHA_E_TARDE, {
              8: [item("p1", "Théo Andrade Lins", "Fonoaudiologia")],
              15: [item("p2", "Théo Andrade Lins", "Terapia ocupacional")],
            }),
            day(1, MANHA_E_TARDE, {}),
            day(2, MANHA_E_TARDE, { 9: [item("p3", "Théo Andrade Lins", "Fonoaudiologia")] }),
            day(3, MANHA_E_TARDE, { 8: [item("p4", "Théo Andrade Lins", "Psicomotricidade")] }),
            day(4, MANHA_E_TARDE, {}),
          ],
        },
      ],
    } satisfies UnitMapData,
  },
  {
    id: "unit-map-as-people",
    label: "O mapa visto pelo People",
    description:
      "Quem define a agenda padrão dos profissionais não alcança a tela onde o efeito dessa definição aparece.",
    data: {
      unit: UNIDADE,
      axis: "professional",
      granularity: "week",
      week: SEMANA,
      rows: [MARINA, IARA, RENATO],
    } satisfies UnitMapData,
  },
];
