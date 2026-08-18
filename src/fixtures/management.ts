import type { Fixture } from "@brucesantos/design-space";
import type {
  ManagementData,
  ManagementLists,
  ManagementPatient,
  ManagementPerson,
  ManagementTab,
  ReportControl,
} from "../contracts/index.js";

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

function professional(
  id: string,
  name: string,
  specialty: string,
  active = true,
): ManagementPerson {
  return {
    id,
    name,
    specialty,
    active,
    initials: name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join(""),
  };
}

function patient(id: string, name: string, active = true): ManagementPatient {
  return {
    id,
    name,
    active,
    initials: name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join(""),
  };
}

const CLARA = professional("prof-clara", "Clara Vidigal", "Psicologia");
const MARINA = professional("prof-marina", "Marina Okabe", "Fonoaudiologia");
const RUI = professional("prof-rui", "Rui Sampaio Neto", "Psicologia");
const HELENA = professional("prof-helena", "Helena Braga", "Terapia Ocupacional");
const OTAVIO = professional("prof-otavio", "Otávio Ferrandini", "Aplicador ABA");
const BIANCA = professional("prof-bianca", "Bianca Torres", "Aplicador ABA");
const CAIO = professional("prof-caio", "Caio Nunes", "Fisioterapia", false);

const THEO = patient("pac-theo", "Théo Andrade Lins");
const ISADORA = patient("pac-isadora", "Isadora Bueno Ramalho");
const BENICIO = patient("pac-benicio", "Benício Tavares Rocha");
const NOAH = patient("pac-noah", "Noah Rivas Camargo");
const LAURA = patient("pac-laura", "Laura Mendes Pinto", false);

const LISTS: ManagementLists = {
  supervisors: [
    { professional: CLARA, applicatorCount: 4 },
    { professional: MARINA, applicatorCount: 2 },
    { professional: RUI, applicatorCount: 0 },
    { professional: CAIO, applicatorCount: 1 },
  ],
  applicators: [
    { id: "int-1", professional: OTAVIO, supervisor: CLARA, needsSupervisorSignature: true },
    { id: "int-2", professional: BIANCA, supervisor: MARINA, needsSupervisorSignature: false },
    { id: "int-3", professional: HELENA, supervisor: CLARA, needsSupervisorSignature: true },
  ],
  clinicalOwners: [
    { patient: THEO, responsible: MARINA },
    { patient: ISADORA, responsible: CLARA },
    { patient: NOAH },
    { patient: LAURA, responsible: RUI },
  ],
  patientRegistration: [
    { person: THEO, missing: ["Mapa de Horas"] },
    { person: NOAH, missing: ["Plano de Saúde", "Nível de Suporte"] },
    { person: LAURA, missing: ["Vínculo de Unidade"] },
  ],
  professionalRegistration: [
    { person: HELENA, specialty: HELENA.specialty, missing: ["Vínculo de Unidade", "Contrato"] },
    { person: OTAVIO, specialty: OTAVIO.specialty, missing: ["Escala", "Contrato"] },
    { person: CAIO, specialty: CAIO.specialty, missing: ["Vínculo de Unidade"] },
  ],
  authorizations: [
    { id: "auth-1", patient: THEO, durationEndAt: "2026-09-30", status: "active" },
    { id: "auth-2", patient: ISADORA, durationEndAt: "2026-07-31", status: "expired" },
    { id: "auth-3", patient: BENICIO, durationEndAt: "2026-11-15", status: "active" },
  ],
  professionalsBySpecialty: [
    { specialty: "Psicologia", total: 12, coordinators: 1, supervisors: 3, therapists: 4, applicators: 3, trainees: 1 },
    { specialty: "Fonoaudiologia", total: 9, coordinators: 1, supervisors: 2, therapists: 3, applicators: 2, trainees: 1 },
    { specialty: "Terapia Ocupacional", total: 7, coordinators: 0, supervisors: 2, therapists: 2, applicators: 2, trainees: 1 },
    { specialty: "Fisioterapia", total: 4, coordinators: 0, supervisors: 1, therapists: 2, applicators: 1, trainees: 0 },
  ],
  hourMaps: [
    { id: "map-1", patient: THEO },
    { id: "map-2", patient: ISADORA, durationStartAt: "2026-07-01", durationEndAt: "2026-09-30", weeklyHours: 12, status: "Em vigência" },
    { id: "map-3", patient: BENICIO, durationStartAt: "2026-08-10", durationEndAt: "2026-11-10", weeklyHours: 8, status: "Aguardando" },
  ],
  reportControls: RELATORIOS,
  absences: [
    { professional: OTAVIO, missingDays: 4, missingHours: 18, presencePercentage: 68 },
    { professional: HELENA, missingDays: 2, missingHours: 9, presencePercentage: 82 },
    { professional: MARINA, missingDays: 0, missingHours: 0, presencePercentage: 97 },
  ],
  interventionPlans: [
    { id: "pic-1", patient: THEO, startAt: "2026-07-01", endAt: "2026-12-31", createdBy: CLARA, signedBy: { name: "Elisa Lins", phone: "(11) 90000-0101", initials: "EL" }, status: "active" },
    { id: "pic-2", patient: ISADORA, startAt: "2026-08-20", endAt: "2027-02-20", createdBy: RUI, status: "pending" },
    { id: "pic-3", patient: BENICIO, startAt: "2025-12-01", endAt: "2026-06-01", createdBy: MARINA, signedBy: { name: "Lucas Rocha", phone: "(11) 90000-0102", initials: "LR" }, status: "expired" },
  ],
};

const TAB_FIXTURES: { tab: ManagementTab; id: string; label: string; description: string }[] = [
  { tab: "supervisors", id: "management-supervisors", label: "Supervisores", description: "Supervisores e coordenadores, com quantidade de aplicadores vinculados." },
  { tab: "applicators", id: "management-applicators", label: "Aplicadores", description: "Vínculos entre aplicadores e supervisores, incluindo a exigência de segunda assinatura." },
  { tab: "clinical-owners", id: "management-clinical-owners", label: "Responsáveis Clínicos", description: "Pacientes ativos e o profissional responsável por cada caso." },
  { tab: "patient-registration", id: "management-patient-registration", label: "Cadastro de Pacientes", description: "Pacientes com plano, unidade, nível de suporte ou mapa de horas faltando." },
  { tab: "professional-registration", id: "management-professional-registration", label: "Cadastro de Profissionais", description: "Profissionais sem unidade, escala ativa ou contrato vigente." },
  { tab: "authorizations", id: "management-authorizations", label: "Autorizações", description: "Autorizações ativas, separadas entre vigentes e vencidas." },
  { tab: "professionals-by-specialty", id: "management-professionals-by-specialty", label: "Profissionais por Especialidade", description: "Distribuição de profissionais por especialidade e tipo de atuação." },
  { tab: "hour-maps", id: "management-hour-maps", label: "Mapa de Horas", description: "Pacientes sem padrão e mapas vigentes, aguardando ou encerrados." },
  { tab: "report-control", id: "management-report-control", label: "Controle de Relatórios", description: "Solicitações de relatório com paciente, profissional, prazo e status." },
  { tab: "absences", id: "management-absences", label: "Faltas Profissionais", description: "Dias e horas de falta, com percentual de presença por profissional." },
  { tab: "intervention-plans", id: "management-intervention-plans", label: "Planos terapêuticos", description: "Planos de intervenção comportamental vigentes, pendentes e expirados." },
];

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
  {
    id: "management-grouped-navigation",
    label: "Abas reorganizadas por contexto",
    description: "A proposta de navegação sobre as onze listas existentes, sem alteração no conteúdo de nenhuma delas.",
    data: management({ activeTab: "supervisors", lists: LISTS }),
  },
  ...TAB_FIXTURES.map(({ tab, id, label, description }) => ({
    id,
    label,
    description,
    data: management({ activeTab: tab, lists: LISTS }),
  })),
];
