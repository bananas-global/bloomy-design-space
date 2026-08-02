import type { Fixture } from "@brucesantos/design-space";
import type { ManagementData, ReportControl } from "../contracts/index.js";

/**
 * Fixtures da gerência.
 *
 * A unidade Pinheiros numa segunda de manhã, que é quando a coordenação abre
 * esta tela. As quatro frentes com pendência real convivendo — e, entre os
 * relatórios atrasados, um da operadora e um da família, para a diferença de
 * consequência ficar visível lado a lado.
 */

const NOW = "2026-08-03T09:00:00.000-03:00";
const UNIDADE = { id: "un-pinheiros", name: "Pinheiros" };

function report(overrides: Partial<ReportControl> & { id: string }): ReportControl {
  return {
    patientName: "Théo Andrade Lins",
    professionalName: "Marina Okabe",
    reportType: "evolution_month",
    status: "not_started",
    requester: "operator",
    dueDate: "2026-07-31",
    ...overrides,
  };
}

const RELATORIOS: ReportControl[] = [
  report({
    id: "rep-1",
    requester: "operator",
    dueDate: "2026-07-25",
    observations: "Bradesco condicionou a próxima autorização à entrega deste relatório.",
  }),
  report({
    id: "rep-2",
    patientName: "Isadora Bueno Ramalho",
    professionalName: "Clara Vidigal",
    requester: "family",
    dueDate: "2026-07-20",
    status: "in_progress",
    observations: "Mãe pediu na devolutiva de junho para levar ao neurologista.",
  }),
  report({
    id: "rep-3",
    patientName: "Benício Tavares Rocha",
    professionalName: "Rui Sampaio Neto",
    reportType: "hospital_discharge",
    requester: "operator",
    dueDate: "2026-08-14",
  }),
  report({
    id: "rep-4",
    patientName: "Laura Menendes Pinto",
    requester: "family",
    dueDate: "2026-07-10",
    status: "completed",
  }),
];

function management(overrides: Partial<ManagementData> = {}): ManagementData {
  return {
    unit: UNIDADE,
    now: NOW,
    reports: RELATORIOS,
    mentorshipGaps: [
      {
        professionalId: "prof-otavio",
        professionalName: "Otávio Ferrandini",
        specialty: "Aplicador ABA",
        kind: "applicator_without_supervisor",
      },
      {
        professionalId: "prof-clara",
        professionalName: "Clara Vidigal",
        specialty: "Psicologia",
        kind: "supervisor_without_applicators",
      },
    ],
    incompleteProfessionals: [
      {
        id: "prof-helena",
        name: "Helena Braga",
        specialty: "Terapia Ocupacional",
        missing: ["CPF", "data de nascimento", "formação em saúde"],
      },
    ],
    patientsWithoutOwner: [
      {
        id: "pac-noah",
        name: "Noah Rivas Camargo",
        unitName: "Pinheiros",
        sinceDate: "2026-06-18",
      },
    ],
    ...overrides,
  };
}

export const managementFixtures: Fixture<ManagementData>[] = [
  {
    id: "management-monday",
    label: "Segunda de manhã",
    description:
      "As quatro frentes com pendência: dois relatórios atrasados de origens diferentes, um aplicador sem supervisor, um cadastro incompleto e um paciente sem responsável.",
    data: management(),
  },
  {
    id: "management-reports-overdue",
    label: "Relatórios atrasados de origens diferentes",
    description:
      "Um pedido pela operadora há 9 dias e um pela família há 14. O mais antigo não é o mais urgente.",
    data: management({
      mentorshipGaps: [],
      incompleteProfessionals: [],
      patientsWithoutOwner: [],
    }),
  },
  {
    id: "management-mentorship-gap",
    label: "Aplicador sem supervisor",
    description:
      "A lacuna que aparece semanas depois, como atendimentos pendentes de uma assinatura que ninguém pode dar.",
    data: management({ reports: [], incompleteProfessionals: [], patientsWithoutOwner: [] }),
  },
  {
    id: "management-clear",
    label: "Nenhuma pendência",
    description: "A segunda em que a coordenação abre a tela e pode fechá-la.",
    data: management({
      reports: [RELATORIOS[3]!],
      mentorshipGaps: [],
      incompleteProfessionals: [],
      patientsWithoutOwner: [],
    }),
  },
];
