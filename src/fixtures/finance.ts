import type { Fixture } from "@brucesantos/design-space";
import type { Claim, FinanceData } from "../contracts/index.js";

/**
 * Fixtures do financeiro.
 *
 * Os códigos de recusa (`TUSS-3001` e afins) são inventados, mas seguem o formato
 * que a analista vê na resposta do convênio — porque é esse código que ela usa
 * para conversar com o convênio, e um placeholder genérico esconderia que ele
 * precisa estar visível na tela.
 */

const patients = {
  ana: { id: "pt-1", name: "Ana Moreira", birthDate: "1988-04-12" },
  marina: { id: "pt-3", name: "Marina Lopes", birthDate: "1972-01-25" },
  julia: { id: "pt-5", name: "Júlia Prado", birthDate: "1966-06-30" },
  pedro: { id: "pt-6", name: "Pedro Antunes", birthDate: "2001-02-17" },
} as const;

const underReview: Claim = {
  id: "GUI-4090",
  patient: patients.ana,
  procedure: "Consulta de rotina",
  amountCents: 18_000,
  insurer: "Unimed",
  status: "under_review",
  submittedAt: "2026-07-27T10:12:00.000-03:00",
  documents: [{ id: "d-1", name: "Guia de atendimento", received: true }],
  history: [
    { at: "2026-07-27T10:12:00.000-03:00", label: "Guia enviada ao convênio", by: "clinic" },
    { at: "2026-07-27T14:30:00.000-03:00", label: "Recebida para análise", by: "insurer" },
  ],
};

/**
 * Guia recusada com dois documentos faltando.
 *
 * É o cenário central do módulo: a recusa tem motivo e código visíveis, e o
 * reenvio está bloqueado por regra — não por falta de botão.
 */
const denied: Claim = {
  id: "GUI-4042",
  patient: patients.julia,
  procedure: "Ressonância de joelho direito",
  amountCents: 142_500,
  insurer: "SulAmérica",
  status: "denied",
  submittedAt: "2026-07-21T09:05:00.000-03:00",
  denial: {
    code: "TUSS-3001",
    reason:
      "Procedimento requer relatório clínico assinado e laudo de exame anterior. Documentação recebida incompleta.",
    at: "2026-07-24T16:48:00.000-03:00",
  },
  documents: [
    { id: "d-1", name: "Guia de atendimento", received: true },
    { id: "d-2", name: "Pedido médico", received: true },
    {
      id: "d-3",
      name: "Relatório clínico assinado",
      received: false,
      note: "Precisa da assinatura e do CRM do profissional solicitante.",
    },
    {
      id: "d-4",
      name: "Laudo do exame anterior",
      received: false,
      note: "Radiografia de 2025 citada no pedido médico.",
    },
  ],
  history: [
    { at: "2026-07-21T09:05:00.000-03:00", label: "Guia enviada ao convênio", by: "clinic" },
    { at: "2026-07-24T16:48:00.000-03:00", label: "Recusada — TUSS-3001", by: "insurer" },
  ],
};

/** A mesma guia com um documento a menos: pendência declarada, não recusa. */
const pendingDocuments: Claim = {
  id: "GUI-4051",
  patient: patients.marina,
  procedure: "Fisioterapia — 10 sessões",
  amountCents: 96_000,
  insurer: "Bradesco Saúde",
  status: "pending_documents",
  submittedAt: "2026-07-28T11:20:00.000-03:00",
  documents: [
    { id: "d-1", name: "Guia de atendimento", received: true },
    { id: "d-2", name: "Pedido médico", received: true },
    {
      id: "d-3",
      name: "Relatório de evolução",
      received: false,
      note: "Exigido a partir da sexta sessão.",
    },
  ],
  history: [
    { at: "2026-07-28T11:20:00.000-03:00", label: "Guia enviada ao convênio", by: "clinic" },
    {
      at: "2026-07-29T08:15:00.000-03:00",
      label: "Convênio solicitou relatório de evolução",
      by: "insurer",
    },
  ],
};

/** A guia recusada, agora com todos os documentos anexados. Reenvio liberado. */
const readyToResubmit: Claim = {
  ...denied,
  documents: denied.documents.map((document) => ({ ...document, received: true, note: undefined })),
  history: [
    ...denied.history,
    {
      at: "2026-07-29T17:02:00.000-03:00",
      label: "Relatório clínico assinado anexado",
      by: "clinic",
    },
    { at: "2026-07-30T08:40:00.000-03:00", label: "Laudo do exame anterior anexado", by: "clinic" },
  ],
};

const approved: Claim = {
  id: "GUI-4033",
  patient: patients.pedro,
  procedure: "Consulta de retorno",
  amountCents: 12_000,
  insurer: "Unimed",
  status: "approved",
  submittedAt: "2026-07-15T09:00:00.000-03:00",
  documents: [{ id: "d-1", name: "Guia de atendimento", received: true }],
  history: [
    { at: "2026-07-15T09:00:00.000-03:00", label: "Guia enviada ao convênio", by: "clinic" },
    { at: "2026-07-18T10:30:00.000-03:00", label: "Autorizada", by: "insurer" },
  ],
};

export const financeFixtures: Fixture<FinanceData>[] = [
  {
    id: "claims-queue",
    label: "Fila de guias",
    description: "Análise, recusa, pendência e autorizada convivendo. É a fila da analista.",
    data: { claims: [denied, pendingDocuments, underReview, approved] },
  },
  {
    id: "claim-denied",
    label: "Guia recusada, documentação incompleta",
    description: "SulAmérica, TUSS-3001. Dois documentos faltando, reenvio bloqueado por regra.",
    data: { claims: [denied] },
  },
  {
    id: "claim-pending-documents",
    label: "Guia com pendência de documento",
    description: "Bradesco pediu relatório de evolução. Não é recusa.",
    data: { claims: [pendingDocuments] },
  },
  {
    id: "claim-ready-to-resubmit",
    label: "Guia recusada, documentação completa",
    description: "A mesma guia recusada, com tudo anexado. Reenvio liberado.",
    data: { claims: [readyToResubmit] },
  },
  {
    id: "claim-under-review",
    label: "Guia em análise",
    description: "Enviada e aguardando o convênio. Nada a fazer além de acompanhar.",
    data: { claims: [underReview] },
  },
  {
    id: "claims-empty",
    label: "Nenhuma guia pendente",
    description: "Fila zerada.",
    data: { claims: [] },
  },
];

export const claimIds = {
  denied: denied.id,
  pendingDocuments: pendingDocuments.id,
  underReview: underReview.id,
  approved: approved.id,
} as const;
