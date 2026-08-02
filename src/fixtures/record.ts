import type { Fixture } from "@brucesantos/design-space";
import type { PatientDocument, PatientRecord } from "../contracts/index.js";

/**
 * Fixtures do prontuário.
 *
 * O Théo das outras fixtures, agora pelo lado do que a clínica guarda sobre
 * ele: documentos com validade, a anamnese e os critérios de alerta de falta.
 *
 * Os três tipos de documento aparecem juntos de propósito — é a situação em que
 * fica evidente que dois deles não são abertos por ninguém.
 */

const NOW = "2026-07-30T09:00:00.000-03:00";
const THEO = { id: "pac-theo", name: "Théo Andrade Lins", birthDate: "2019-11-04" };

const DOCUMENTOS: PatientDocument[] = [
  {
    id: "doc-1",
    name: "Laudo neuropediátrico",
    type: "clinical",
    validFrom: "2025-08-12",
    validUntil: "2026-08-12",
    // Laudo demora meses para renovar: o aviso começa cedo.
    alertLeadDays: 60,
  },
  {
    id: "doc-2",
    name: "Carteirinha do convênio",
    type: "administrative",
    validFrom: "2026-01-01",
    validUntil: "2026-08-05",
    alertLeadDays: 15,
  },
  {
    id: "doc-3",
    name: "Documento de identidade do responsável",
    type: "personal",
  },
  {
    id: "doc-4",
    name: "Relatório de evolução — 1º semestre",
    type: "clinical",
  },
];

const VENCIDO: PatientDocument = {
  id: "doc-5",
  name: "Autorização de uso de imagem",
  type: "clinical",
  validFrom: "2025-06-01",
  validUntil: "2026-06-01",
  alertLeadDays: 30,
};

function record(overrides: Partial<PatientRecord> = {}): PatientRecord {
  return {
    patient: THEO,
    documents: DOCUMENTOS,
    anamnese: {
      status: "finished",
      behaviors: {
        usesBottle: "Não, deixou aos 2 anos",
        sucksThumb: "Sim, principalmente ao dormir",
        sittingPositionAtHome: "Senta em W com frequência",
        usesScreenDevices: "Cerca de 2 horas por dia, tablet",
      },
      updatedAt: "2026-01-14T16:20:00.000-03:00",
    },
    alertCriteria: {
      maximumConsecutiveAbsences: 3,
      maximumAbsences: 6,
      requiredSessionCount: 12,
    },
    attendance: { consecutiveAbsences: 1, absences: 2, sessions: 14 },
    now: NOW,
    ...overrides,
  };
}

export const recordFixtures: Fixture<PatientRecord>[] = [
  {
    id: "record-complete",
    label: "Prontuário completo",
    description:
      "Quatro documentos dos três tipos, anamnese finalizada e frequência dentro dos critérios.",
    data: record(),
  },
  {
    id: "record-documents-expiring",
    label: "Documentos vencendo e vencido",
    description:
      "Laudo a 13 dias do vencimento com aviso de 60, carteirinha a 6 dias com aviso de 15, e uma autorização já vencida.",
    data: record({ documents: [...DOCUMENTOS, VENCIDO] }),
  },
  {
    id: "record-anamnese-incomplete",
    label: "Anamnese incompleta",
    description:
      "Dois dos quatro campos de comportamento em branco. Finalizar não pode — e hoje o sistema finge que pôde.",
    data: record({
      anamnese: {
        status: "pending",
        behaviors: {
          usesBottle: "Não, deixou aos 2 anos",
          sucksThumb: "   ",
          sittingPositionAtHome: "Senta em W com frequência",
        },
        updatedAt: "2026-07-29T11:05:00.000-03:00",
      },
    }),
  },
  {
    id: "record-absence-alerts",
    label: "Critérios de falta estourados",
    description:
      "Quatro faltas seguidas contra um limite de três, e sete no período contra seis. Frequência abaixo do plano.",
    data: record({
      attendance: { consecutiveAbsences: 4, absences: 7, sessions: 9 },
    }),
  },
  {
    id: "record-no-criteria",
    label: "Sem critérios configurados",
    description:
      "Paciente sem critérios de alerta. Nenhum limite de falta é aplicado — nem o da clínica, porque não existe.",
    data: record({ alertCriteria: undefined }),
  },
];
