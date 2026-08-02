import type { Fixture } from "@brucesantos/design-space";
import type { PatientReport, ReportsData } from "../contracts/index.js";

/**
 * Fixtures dos relatórios.
 *
 * Os documentos que a clínica emitiu sobre o Théo em julho, cobrindo os
 * destinos mais distantes entre si: uma declaração que vai para o empregador da
 * mãe e um relatório evolutivo que vai para a operadora.
 *
 * Uma das fixtures tem a recepção como perfil ativo, de propósito: é o caso em
 * que a permissão de emitir e a de ler discordam.
 */

const NOW = "2026-07-30T09:00:00.000-03:00";

function report(overrides: Partial<PatientReport> & { id: string }): PatientReport {
  return {
    name: "Relatório",
    reportType: "normal",
    status: "elaboration",
    patientName: "Théo Andrade Lins",
    authorName: "Marina Okabe",
    createdAt: "2026-07-20T10:00:00.000-03:00",
    ...overrides,
  };
}

const DECLARACAO: PatientReport = report({
  id: "rel-1",
  name: "Declaração de comparecimento — 23/07",
  reportType: "declaration_of_attendance",
  authorName: "Helena Braga",
  createdAt: "2026-07-23T15:10:00.000-03:00",
  attendance: {
    date: "2026-07-23",
    startTime: "14:00",
    endTime: "15:00",
    guardianName: "Renata Andrade Lins",
  },
});

const DECLARACAO_INCOMPLETA: PatientReport = report({
  id: "rel-2",
  name: "Declaração de comparecimento — 29/07",
  reportType: "declaration_of_attendance",
  authorName: "Helena Braga",
  createdAt: "2026-07-29T15:05:00.000-03:00",
  attendance: {
    date: "2026-07-29",
    startTime: "14:00",
    endTime: "",
    guardianName: "",
  },
});

/** Declaração com conteúdo clínico dentro: o campo aceita, e não deveria sair. */
const DECLARACAO_COM_CLINICO: PatientReport = report({
  id: "rel-3",
  name: "Declaração de comparecimento — 16/07",
  reportType: "declaration_of_attendance",
  authorName: "Helena Braga",
  createdAt: "2026-07-16T15:00:00.000-03:00",
  content:
    "Paciente em acompanhamento para transtorno do espectro autista, com dificuldades de socialização.",
  attendance: {
    date: "2026-07-16",
    startTime: "14:00",
    endTime: "15:00",
    guardianName: "Renata Andrade Lins",
  },
});

const EVOLUTIVO: PatientReport = report({
  id: "rel-4",
  name: "Relatório evolutivo — 1º semestre",
  reportType: "evolution_report",
  status: "generated_pdf",
  ownerName: "Clara Vidigal",
  authorName: "Marina Okabe",
  createdAt: "2026-07-05T11:00:00.000-03:00",
  period: { start: "2026-01-01", end: "2026-06-30" },
  content:
    "Evolução consistente em imitação motora e mando com apoio. Tato de figuras ainda inconsistente.",
});

const PARA_OPERADORA: PatientReport = report({
  id: "rel-5",
  name: "Relatório para operadora — julho",
  reportType: "health_care_report",
  ownerName: "Clara Vidigal",
  authorName: "Clara Vidigal",
  createdAt: "2026-07-28T09:30:00.000-03:00",
  period: { start: "2026-07-01", end: "2026-07-31" },
});

export const reportFixtures: Fixture<ReportsData>[] = [
  {
    id: "reports-list",
    label: "Relatórios do paciente",
    description:
      "Cinco documentos com destinos diferentes: empregador, operadora e família.",
    data: {
      now: NOW,
      currentRole: "coordinator",
      reports: [DECLARACAO, DECLARACAO_INCOMPLETA, EVOLUTIVO, PARA_OPERADORA],
    },
  },
  {
    id: "reports-declaration-incomplete",
    label: "Declaração sem horário de saída",
    description:
      "Falta o horário de saída e o nome do responsável. Sem eles, ela não prova nada.",
    data: { now: NOW, currentRole: "attendant", reports: [DECLARACAO_INCOMPLETA] },
  },
  {
    id: "reports-declaration-with-clinical",
    label: "Declaração com conteúdo clínico",
    description:
      "O campo aceita, e o documento vai para o RH de uma empresa. É o único tipo que sai do circuito da saúde.",
    data: { now: NOW, currentRole: "attendant", reports: [DECLARACAO_COM_CLINICO] },
  },
  {
    id: "reports-issuing-without-reading",
    label: "Recepção emitindo relatório clínico",
    description:
      "A recepção pode emitir um relatório evolutivo e não alcança a visão clínica do paciente.",
    data: { now: NOW, currentRole: "attendant", reports: [EVOLUTIVO, PARA_OPERADORA] },
  },
  {
    id: "reports-generated",
    label: "Relatório com PDF gerado",
    description: "O documento já saiu da clínica. Editar faria o sistema divergir do papel.",
    data: { now: NOW, currentRole: "coordinator", reports: [EVOLUTIVO] },
  },
  {
    id: "reports-empty",
    label: "Nenhum relatório emitido",
    description: "Paciente sem documento emitido até agora.",
    data: { now: NOW, currentRole: "coordinator", reports: [] },
  },
];
