import type { Fixture } from "@brucesantos/design-space";
import type { HealthCare, HealthcareInvoice, HealthcareInvoicesData, InvoiceLine } from "../contracts/index.js";

/**
 * Fixtures da fatura de convênio.
 *
 * A competência de julho para uma operadora, montada para exercitar as duas
 * maneiras silenciosas de a clínica perder dinheiro: a autorização que não
 * entra por não ter atendimento, e a que entra valendo zero por não ter acordo
 * ativo.
 *
 * CNPJ, registro ANS e códigos de prestador são sintéticos e não correspondem a
 * nenhuma operadora real.
 */

const NOW = "2026-08-01T09:00:00.000-03:00";

const BRADESCO: HealthCare = {
  id: "op-bradesco",
  name: "Bradesco Saúde",
  ansRegister: "005711",
  cnpj: "11.222.333/0001-44",
  providerCode: "PRT-9081",
  requesterCode: "SOL-4417",
  skipEligibility: false,
  planTypes: ["Efetivo Pleno", "Nacional Flex"],
};

/** Operadora sem os códigos que o lote TISS exige. Passa no cadastro, falha no envio. */
const SEM_CODIGOS: HealthCare = {
  ...BRADESCO,
  id: "op-incompleta",
  name: "Vitalis Saúde",
  ansRegister: "419283",
  cnpj: "44.555.666/0001-22",
  providerCode: undefined,
  requesterCode: undefined,
  skipEligibility: true,
  planTypes: ["Único"],
};

function line(overrides: Partial<InvoiceLine> & { authorizationId: string }): InvoiceLine {
  return {
    guideNumber: `G-${overrides.authorizationId.slice(-4)}`,
    patientName: "Théo Andrade Lins",
    packageName: "Terapia ABA — 4 sessões semanais",
    quantity: 16,
    executedSessions: 16,
    agreementPriceCents: 18_500,
    ...overrides,
  };
}

const normal = line({ authorizationId: "aut-7001", guideNumber: "G-7001" });

const outroPaciente = line({
  authorizationId: "aut-7002",
  guideNumber: "G-7002",
  patientName: "Isadora Bueno Ramalho",
  packageName: "Psicologia — 2 sessões semanais",
  quantity: 8,
  executedSessions: 7,
  agreementPriceCents: 22_000,
});

/** Autorizada e nunca usada: o monólito a descarta antes de somar. */
const semAtendimento = line({
  authorizationId: "aut-7003",
  guideNumber: "G-7003",
  patientName: "Benício Tavares Rocha",
  packageName: "Fonoaudiologia — 1 sessão semanal",
  quantity: 4,
  executedSessions: 0,
  agreementPriceCents: 19_000,
});

/** Atendida e sem acordo ativo: entra na fatura valendo zero, em silêncio. */
const semAcordo = line({
  authorizationId: "aut-7004",
  guideNumber: "G-7004",
  patientName: "Laura Menendes Pinto",
  packageName: "Terapia Ocupacional — 2 sessões semanais",
  quantity: 8,
  executedSessions: 8,
  agreementPriceCents: undefined,
});

function invoice(overrides: Partial<HealthcareInvoice> = {}): HealthcareInvoice {
  return {
    id: "fat-2026-07-bradesco",
    healthCare: BRADESCO,
    status: "pending",
    invoiceType: "health_care",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    lines: [normal, outroPaciente],
    ...overrides,
  };
}

export const invoiceFixtures: Fixture<HealthcareInvoicesData>[] = [
  {
    id: "invoice-ready",
    label: "Fatura pronta para fechar",
    description:
      "Duas autorizações atendidas, com acordo ativo, e os três identificadores do lote preenchidos.",
    data: {
      now: NOW,
      invoice: invoice({ number: "2026-07-0148", protocol: "PRT-88213", igdr: "IGDR-2026-07" }),
    },
  },
  {
    id: "invoice-missing-fields",
    label: "Faltam os identificadores do lote",
    description: "Protocolo e IGDR em branco. O lote não fecha sem os três.",
    data: { now: NOW, invoice: invoice({ number: "2026-07-0148" }) },
  },
  {
    id: "invoice-silent-losses",
    label: "As duas perdas silenciosas",
    description:
      "Uma autorização sem atendimento, que não entra, e uma atendida sem acordo ativo, que entra valendo zero.",
    data: {
      now: NOW,
      invoice: invoice({
        number: "2026-07-0148",
        protocol: "PRT-88213",
        igdr: "IGDR-2026-07",
        lines: [normal, semAtendimento, semAcordo],
      }),
    },
  },
  {
    id: "invoice-nothing-executed",
    label: "Nenhum atendimento no período",
    description: "Todas as autorizações do mês ficaram sem execução. Não há o que faturar.",
    data: {
      now: NOW,
      invoice: invoice({
        number: "2026-07-0148",
        protocol: "PRT-88213",
        igdr: "IGDR-2026-07",
        lines: [semAtendimento],
      }),
    },
  },
  {
    id: "invoice-generated",
    label: "Lote já gerado",
    description: "O XML foi produzido a partir deste conteúdo. Editar depois cria divergência.",
    data: {
      now: NOW,
      invoice: invoice({
        status: "generated_invoice",
        number: "2026-07-0148",
        protocol: "PRT-88213",
        igdr: "IGDR-2026-07",
      }),
    },
  },
  {
    id: "invoice-health-care-incomplete",
    label: "Operadora sem códigos TISS",
    description:
      "Cadastro sem código de prestador e de solicitante — opcionais no schema, obrigatórios no lote.",
    data: {
      now: NOW,
      invoice: invoice({
        healthCare: SEM_CODIGOS,
        number: "2026-07-0201",
        protocol: "PRT-90114",
        igdr: "IGDR-2026-07",
      }),
    },
  },
];

export const invoiceHealthCares = { bradesco: BRADESCO, semCodigos: SEM_CODIGOS } as const;
