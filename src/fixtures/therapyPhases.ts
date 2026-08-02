import type { Fixture } from "@brucesantos/design-space";
import type {
  DeactivationImpact,
  TherapyPhasesData,
} from "../contracts/index.js";

/**
 * Fixtures da fase terapêutica e da inativação.
 *
 * O Théo aparece em quatro especialidades e em quatro etapas diferentes — que é
 * o ponto do módulo. Uma das fases está sem especialidade, reproduzindo o
 * changeset que não exige nenhuma.
 *
 * Na inativação, a data de corte é a de referência (30/07) e há um atendimento
 * em 29/07 às 21h30: ele cai junto por causa do `~T[00:00:00]` em UTC, e existe para essa perda
 * ser mensurável em vez de argumentada.
 */

const THEO = { id: "pac-theo", name: "Théo Andrade Lins", birthDate: "2019-11-04" };

export const therapyPhaseFixtures: Fixture[] = [
  {
    id: "therapy-phases-uneven",
    label: "Quatro especialidades, quatro etapas",
    description:
      "O percurso não caminha junto: terapia na fonoaudiologia, ambientação na psicologia, e uma fase pendurada sem especialidade.",
    data: {
      patient: THEO,
      phases: [
        {
          id: "tp-1",
          specialty: "phonoaudiology",
          step: "therapy",
          updatedAt: "2026-06-15T10:00:00.000-03:00",
        },
        {
          id: "tp-2",
          specialty: "occupational_therapy",
          step: "reassessment",
          updatedAt: "2026-07-20T10:00:00.000-03:00",
        },
        {
          id: "tp-3",
          specialty: "psychology",
          step: "ambiance",
          updatedAt: "2026-07-28T10:00:00.000-03:00",
        },
        {
          id: "tp-4",
          specialty: "aba_practitioner",
          step: "pre_intervention",
          updatedAt: "2026-07-10T10:00:00.000-03:00",
        },
        // Sem especialidade: gravável, e sem lugar no percurso.
        { id: "tp-5", step: "therapy", updatedAt: "2026-05-02T10:00:00.000-03:00" },
      ],
      specialtiesWithoutPhase: ["music_therapy"],
    } satisfies TherapyPhasesData,
  },
  {
    id: "therapy-phases-all-beginning",
    label: "Tudo em ambientação",
    description:
      "Três especialidades, todas no valor padrão do campo. Não dá para saber se foi escolhido ou se ninguém preencheu.",
    data: {
      patient: THEO,
      phases: [
        {
          id: "tp-1",
          specialty: "phonoaudiology",
          step: "ambiance",
          updatedAt: "2026-07-28T10:00:00.000-03:00",
        },
        {
          id: "tp-2",
          specialty: "psychology",
          step: "ambiance",
          updatedAt: "2026-07-28T10:00:00.000-03:00",
        },
        {
          id: "tp-3",
          specialty: "occupational_therapy",
          step: "ambiance",
          updatedAt: "2026-07-28T10:00:00.000-03:00",
        },
      ],
      specialtiesWithoutPhase: [],
    } satisfies TherapyPhasesData,
  },
  {
    id: "therapy-phases-empty",
    label: "Nenhuma fase registrada",
    description: "O paciente atende em duas especialidades e não tem fase em nenhuma.",
    data: {
      patient: THEO,
      phases: [],
      specialtiesWithoutPhase: ["phonoaudiology", "psychology"],
    } satisfies TherapyPhasesData,
  },
];

export const deactivationFixtures: Fixture[] = [
  {
    id: "deactivation-today",
    label: "Inativar a partir de hoje",
    description:
      "Cinco agendamentos, dois mapas de horas em vigor — e um atendimento da véspera às 21h30 que cai junto.",
    data: {
      patient: THEO,
      deactivationDate: "2026-07-30",
      schedulesToCancel: [
        {
          id: "s0",
          start: "2026-07-29T21:30:00.000-03:00",
          serviceName: "Acompanhamento terapêutico",
          professionalName: "Otávio Ferrandini",
        },
        {
          id: "s1",
          start: "2026-07-30T14:00:00.000-03:00",
          serviceName: "Sessão de intervenção ABA",
          professionalName: "Marina Okabe",
        },
        {
          id: "s2",
          start: "2026-08-04T09:00:00.000-03:00",
          serviceName: "Terapia ocupacional",
          professionalName: "Renato Bezerra Alcântara",
        },
        {
          id: "s3",
          start: "2026-08-10T14:00:00.000-03:00",
          serviceName: "Sessão de intervenção ABA",
          professionalName: "Marina Okabe",
        },
        {
          id: "s4",
          start: "2026-08-12T09:00:00.000-03:00",
          serviceName: "Terapia ocupacional",
          professionalName: "Renato Bezerra Alcântara",
        },
      ],
      hourMapsToClose: [
        { id: "hm-1", durationEnd: "2026-12-20" },
        { id: "hm-2", durationEnd: "2026-11-30" },
      ],
      hourMapsLosingAutoRenew: 4,
      path: "manual",
      professionalBonds: [
        { id: "b1", professionalName: "Marina Okabe", observation: "Responde pela fonoaudiologia desde a entrada. Boa vinculação." },
        { id: "b2", professionalName: "Renato Bezerra Alcântara" },
      ],
    } satisfies DeactivationImpact,
  },
  {
    id: "deactivation-by-worker",
    label: "A data chegou e o worker rodou",
    description:
      "A mesma inativação pelo caminho automático: os vínculos profissional–paciente são apagados, com as observações junto.",
    data: {
      patient: THEO,
      deactivationDate: "2026-07-30",
      schedulesToCancel: [
        {
          id: "s1",
          start: "2026-07-30T14:00:00.000-03:00",
          serviceName: "Sessão de intervenção ABA",
          professionalName: "Marina Okabe",
        },
      ],
      hourMapsToClose: [{ id: "hm-1", durationEnd: "2026-12-20" }],
      hourMapsLosingAutoRenew: 4,
      path: "worker",
      professionalBonds: [
        { id: "b1", professionalName: "Marina Okabe", observation: "Responde pela fonoaudiologia desde a entrada. Boa vinculação." },
        { id: "b2", professionalName: "Renato Bezerra Alcântara" },
        { id: "b3", professionalName: "Clara Vidigal", observation: "Supervisiona o caso desde março." },
      ],
    } satisfies DeactivationImpact,
  },
  {
    id: "deactivation-scheduled",
    label: "Inativar a partir do mês que vem",
    description:
      "O paciente continua ativo — e a cascata roda agora. A parte que adia é a que não destrói.",
    data: {
      patient: THEO,
      deactivationDate: "2026-09-01",
      schedulesToCancel: [
        {
          id: "s1",
          start: "2026-09-01T14:00:00.000-03:00",
          serviceName: "Sessão de intervenção ABA",
          professionalName: "Marina Okabe",
        },
        {
          id: "s2",
          start: "2026-09-08T14:00:00.000-03:00",
          serviceName: "Sessão de intervenção ABA",
          professionalName: "Marina Okabe",
        },
      ],
      hourMapsToClose: [{ id: "hm-1", durationEnd: "2026-12-20" }],
      hourMapsLosingAutoRenew: 4,
      path: "manual",
      professionalBonds: [
        { id: "b1", professionalName: "Marina Okabe" },
      ],
    } satisfies DeactivationImpact,
  },
];
