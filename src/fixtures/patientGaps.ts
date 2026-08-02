import type { Fixture } from "@brucesantos/design-space";
import type { PatientGapsData } from "../contracts/index.js";

/**
 * Fixtures das pendências de cadastro.
 *
 * As quatro lacunas que `PatientFilters` sabe filtrar, distribuídas para que a
 * ordenação por consequência tenha o que ordenar: alguém há dez meses em
 * atendimento sem nível de suporte precisa aparecer antes de alguém há duas
 * semanas sem plano.
 */

const p = (id: string, name: string, birthDate: string) => ({ id, name, birthDate });

export const patientGapFixtures: Fixture[] = [
  {
    id: "patient-gaps-mixed",
    label: "Seis pacientes, quatro tipos de lacuna",
    description:
      "As quatro ausências misturadas, com tempos de casa diferentes — para a ordem por consequência ficar visível.",
    data: {
      activePatients: 48,
      patients: [
        {
          patient: p("pac-nina", "Nina Corrêa Bastos", "2018-03-12"),
          gaps: ["support_level"],
          daysInCare: 312,
        },
        {
          patient: p("pac-helena", "Helena Vasconcelos Prado", "2020-06-30"),
          gaps: ["unit", "hour_map"],
          daysInCare: 88,
          supportLevel: 2,
        },
        {
          patient: p("pac-theo", "Théo Andrade Lins", "2019-11-04"),
          gaps: ["hour_map"],
          daysInCare: 240,
          supportLevel: 2,
        },
        {
          patient: p("pac-rafa", "Rafael Toledo Marinho", "2017-09-21"),
          gaps: ["plan"],
          daysInCare: 15,
          supportLevel: 1,
        },
        {
          patient: p("pac-bento", "Bento Queiroga Farias", "2021-01-08"),
          gaps: ["support_level", "plan", "hour_map"],
          daysInCare: 61,
        },
        {
          patient: p("pac-alice", "Alice Bandeira Nogueira", "2019-05-17"),
          gaps: ["plan"],
          daysInCare: 190,
          supportLevel: 3,
        },
      ],
    } satisfies PatientGapsData,
  },
  {
    id: "patient-gaps-clinical-only",
    label: "Só lacunas clínicas",
    description:
      "Dois pacientes sem nível de suporte, um deles há mais de um ano. É a lacuna que não é administrativa.",
    data: {
      activePatients: 48,
      patients: [
        {
          patient: p("pac-nina", "Nina Corrêa Bastos", "2018-03-12"),
          gaps: ["support_level"],
          daysInCare: 412,
        },
        {
          patient: p("pac-bento", "Bento Queiroga Farias", "2021-01-08"),
          gaps: ["support_level"],
          daysInCare: 61,
        },
      ],
    } satisfies PatientGapsData,
  },
  {
    id: "patient-gaps-none",
    label: "Nenhuma pendência",
    description: "Os 48 pacientes ativos têm plano, unidade, mapa de horas e nível de suporte.",
    data: { activePatients: 48, patients: [] } satisfies PatientGapsData,
  },
];
