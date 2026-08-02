import type { Fixture } from "@brucesantos/design-space";
import type {
  SupervisedSchedule,
  SupervisionData,
  SupervisorRow,
} from "../contracts/index.js";

/**
 * Fixtures da supervisão.
 *
 * O período padrão do sistema real é [hoje − 30, hoje] — de 30/06 a 30/07 na
 * data de referência deste Design Space. As datas dos atendimentos ficam dentro
 * dele de propósito, para que o cenário do padrão mostre o que a tela de fato
 * mostra, e não uma lista vazia que esconderia a constatação.
 *
 * Uma supervisora aparece sem vínculo nenhum: é ela que a tela real perde.
 */

const CLARA: SupervisorRow = {
  id: "sup-clara",
  name: "Clara Vidigal",
  specialtyName: "Fonoaudiologia",
  active: true,
  internCount: 3,
};

const RENATO: SupervisorRow = {
  id: "sup-renato",
  name: "Renato Bezerra Alcântara",
  specialtyName: "Terapia ocupacional",
  active: true,
  internCount: 1,
};

/** Recém-designada: tem o papel e ainda não tem ninguém. Some da tela real. */
const IARA: SupervisorRow = {
  id: "sup-iara",
  name: "Iara Monteiro Sales",
  specialtyName: "Psicologia",
  active: true,
  internCount: 0,
};

function schedule(
  overrides: Partial<SupervisedSchedule> & { id: string },
): SupervisedSchedule {
  return {
    professionalName: "Marina Okabe",
    patientName: "Théo Andrade Lins",
    specialtyName: "Fonoaudiologia",
    serviceName: "Sessão de intervenção ABA",
    roomName: "Girassol 2",
    start: "2026-07-24T14:00:00.000-03:00",
    end: "2026-07-24T15:00:00.000-03:00",
    status: "finished",
    needsSupervisorSignature: true,
    ...overrides,
  };
}

const PARADOS: SupervisedSchedule[] = [
  schedule({
    id: "sch-1",
    start: "2026-07-13T14:00:00.000-03:00",
    end: "2026-07-13T15:00:00.000-03:00",
    status: "pending_supervisor_signature",
    signedByProfessionalAt: "2026-07-13T15:12:00.000-03:00",
  }),
  schedule({
    id: "sch-2",
    professionalName: "Otávio Ferrandini",
    patientName: "Helena Vasconcelos Prado",
    start: "2026-07-21T09:00:00.000-03:00",
    end: "2026-07-21T10:00:00.000-03:00",
    status: "pending_supervisor_signature",
    signedByProfessionalAt: "2026-07-21T10:05:00.000-03:00",
  }),
  schedule({
    id: "sch-3",
    professionalName: "Bruna Kishimoto",
    patientName: "Nina Corrêa Bastos",
    roomName: "Ipê 4",
    start: "2026-07-28T16:00:00.000-03:00",
    end: "2026-07-28T17:00:00.000-03:00",
    status: "pending_supervisor_signature",
    signedByProfessionalAt: "2026-07-28T17:08:00.000-03:00",
  }),
];

const RESOLVIDOS: SupervisedSchedule[] = [
  schedule({
    id: "sch-4",
    start: "2026-07-24T14:00:00.000-03:00",
    end: "2026-07-24T15:00:00.000-03:00",
    status: "finished",
    signedByProfessionalAt: "2026-07-24T15:04:00.000-03:00",
    signedBySupervisorAt: "2026-07-24T18:30:00.000-03:00",
  }),
  schedule({
    id: "sch-5",
    professionalName: "Otávio Ferrandini",
    patientName: "Helena Vasconcelos Prado",
    start: "2026-07-27T09:00:00.000-03:00",
    end: "2026-07-27T10:00:00.000-03:00",
    status: "pending_signature",
  }),
  schedule({
    id: "sch-6",
    professionalName: "Bruna Kishimoto",
    patientName: "Nina Corrêa Bastos",
    start: "2026-07-29T11:00:00.000-03:00",
    end: "2026-07-29T12:00:00.000-03:00",
    status: "cancelled",
  }),
];

const PADRAO = { start: "2026-06-30", end: "2026-07-30" };

export const supervisionFixtures: Fixture[] = [
  {
    id: "supervision-default-period",
    label: "O período padrão, olhando 30 dias para trás",
    description:
      "A tela como ela abre: 30/06 a 30/07, sem nada do que vem. Três atendimentos parados esperando a Clara assinar.",
    data: {
      period: PADRAO,
      supervisors: [CLARA, RENATO],
      selectedSupervisorId: "sup-clara",
      schedules: [...PARADOS, ...RESOLVIDOS],
    } satisfies SupervisionData,
  },
  {
    id: "supervision-supervisor-without-links",
    label: "A supervisora recém-designada, que a tela real perde",
    description:
      "Iara tem o papel e nenhum vínculo. O filtro `has_supervisor_internships` a tira da lista exatamente quando alguém precisaria encontrá-la.",
    data: {
      period: PADRAO,
      supervisors: [CLARA, RENATO, IARA],
      selectedSupervisorId: "sup-clara",
      schedules: [...PARADOS, ...RESOLVIDOS],
    } satisfies SupervisionData,
  },
  {
    id: "supervision-forward-period",
    label: "O mesmo mês, olhando para a frente",
    description:
      "O que a tela mostra quando o período inclui o que vem — a semana que ainda dá para acompanhar.",
    data: {
      period: { start: "2026-07-30", end: "2026-08-14" },
      supervisors: [CLARA, RENATO],
      selectedSupervisorId: "sup-clara",
      schedules: [
        schedule({
          id: "sch-7",
          start: "2026-08-03T14:00:00.000-03:00",
          end: "2026-08-03T15:00:00.000-03:00",
          status: "scheduled",
        }),
        schedule({
          id: "sch-8",
          professionalName: "Otávio Ferrandini",
          patientName: "Helena Vasconcelos Prado",
          start: "2026-08-04T09:00:00.000-03:00",
          end: "2026-08-04T10:00:00.000-03:00",
          status: "scheduled",
        }),
        schedule({
          id: "sch-9",
          professionalName: "Bruna Kishimoto",
          patientName: "Nina Corrêa Bastos",
          specialtyName: "Psicomotricidade",
          serviceName: "Avaliação de entrada",
          start: "2026-08-06T16:00:00.000-03:00",
          end: "2026-08-06T17:00:00.000-03:00",
          status: "scheduled",
          needsSupervisorSignature: false,
        }),
      ],
    } satisfies SupervisionData,
  },
  {
    id: "supervision-empty-period",
    label: "Nenhum atendimento no período",
    description:
      "O supervisor selecionado não tem atendimento de supervisionado dentro da janela escolhida.",
    data: {
      period: PADRAO,
      supervisors: [CLARA, RENATO],
      selectedSupervisorId: "sup-renato",
      schedules: [],
    } satisfies SupervisionData,
  },
  {
    id: "supervision-as-supervisor",
    label: "A tela vista por quem supervisiona",
    description:
      "O papel `supervisor` não tem `professionals.list_supervisor`. A tela que leva o nome dele não abre para ele.",
    data: {
      currentSupervisorId: "sup-clara",
      period: PADRAO,
      supervisors: [CLARA, RENATO],
      selectedSupervisorId: "sup-clara",
      schedules: [...PARADOS, ...RESOLVIDOS],
    } satisfies SupervisionData,
  },
];
