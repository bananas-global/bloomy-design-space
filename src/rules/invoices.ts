import type { Rule } from "@brucesantos/design-space";
import type { HealthcareInvoice, InvoiceLine } from "../contracts/index.js";

/**
 * Regras da fatura de convênio.
 *
 * Traduzidas de `HealthcareInvoices.CalculatePriceForInvoice` e
 * `HealthcareInvoices.Finish`. É o último passo do dinheiro: o lote TISS que a
 * clínica envia para receber pelo que atendeu.
 *
 * Duas das quatro regras aqui descrevem maneiras de **perder dinheiro em
 * silêncio** — uma autorização que não entra e uma que entra valendo zero. Nos
 * dois casos o monólito soma sem reclamar, e é por isso que elas viram tela.
 */
export const invoiceRules: Rule[] = [
  {
    id: "invoice-includes-only-executed-authorizations",
    statement:
      "Uma autorização sem nenhum atendimento realizado não entra na fatura, por mais autorizada que esteja.",
    rationale:
      "Faturar autorização sem atendimento é cobrar pelo que não aconteceu. O corte é correto — o risco é ele ser invisível, e a clínica achar que faturou o mês inteiro.",
    source: "src/rules/invoices.ts",
  },
  {
    id: "authorization-without-agreement-is-worth-zero",
    statement:
      "Uma linha cujo pacote não tem acordo ativo com aquela operadora entra na fatura valendo zero.",
    rationale:
      "O monólito soma `0.0` quando não acha acordo vigente, sem erro e sem aviso. O atendimento aconteceu, a autorização existe, e o valor some. É o jeito mais silencioso de a clínica trabalhar de graça.",
    source: "src/rules/invoices.ts",
  },
  {
    id: "invoice-needs-number-protocol-igdr",
    statement:
      "Fechar a fatura exige número, protocolo e IGDR preenchidos. Sem os três, o lote não é gerado.",
    rationale:
      "São os identificadores com que a operadora reconhece o lote. Fechar sem eles produz um envio que ninguém consegue rastrear depois — nem a clínica, nem a operadora.",
    source: "src/rules/invoices.ts",
  },
  {
    id: "generated-invoice-is-final",
    statement:
      "Fatura com lote já gerado não é editada: o XML foi produzido a partir daquele conteúdo.",
    rationale:
      "Alterar depois do envio faz o que a clínica vê divergir do que a operadora recebeu, e a divergência só aparece na glosa.",
    source: "src/rules/invoices.ts",
  },
];

/* =============================================================== cálculo */

/**
 * Implementação de `invoice-includes-only-executed-authorizations`.
 *
 * O monólito faz `Enum.reject(&Enum.empty?(&1.schedule_dailys))` antes de
 * somar. O corte é silencioso lá; aqui ele é uma função com nome, para a tela
 * poder mostrar o que ficou de fora.
 */
export function billableLines(invoice: HealthcareInvoice): InvoiceLine[] {
  return invoice.lines.filter((line) => line.executedSessions > 0);
}

export function excludedLines(invoice: HealthcareInvoice): InvoiceLine[] {
  return invoice.lines.filter((line) => line.executedSessions === 0);
}

/**
 * Implementação de `authorization-without-agreement-is-worth-zero`.
 *
 * Linha sem acordo ativo vale zero — como no monólito. Separar essas linhas é a
 * única forma de a tela avisar antes do envio, porque depois o zero vira só um
 * total menor do que o esperado.
 */
export function linesWithoutAgreement(invoice: HealthcareInvoice): InvoiceLine[] {
  return billableLines(invoice).filter((line) => line.agreementPriceCents === undefined);
}

export function lineTotalCents(line: InvoiceLine): number {
  if (line.executedSessions === 0) return 0;
  return line.quantity * (line.agreementPriceCents ?? 0);
}

/** Total da fatura, pela mesma conta do monólito. */
export function invoiceTotalCents(invoice: HealthcareInvoice): number {
  return billableLines(invoice).reduce((sum, line) => sum + lineTotalCents(line), 0);
}

/**
 * Quantas sessões cobráveis estão indo para a fatura valendo zero.
 *
 * Conta sessões, e não dinheiro, porque **o dinheiro é desconhecível**: sem
 * acordo ativo não existe preço a aplicar, e estimar um seria inventar um
 * número que a operadora nunca vai pagar. O que a tela consegue afirmar com
 * honestidade é o tamanho do buraco em atendimentos — e isso já basta para
 * alguém ir atrás do acordo antes de enviar o lote.
 */
export function sessionsWithoutAgreement(invoice: HealthcareInvoice): number {
  return linesWithoutAgreement(invoice).reduce((sum, line) => sum + line.quantity, 0);
}

/* ============================================================== fechamento */

type Decision = { allowed: boolean; reason?: string };

/** Implementação de `invoice-needs-number-protocol-igdr` e `generated-invoice-is-final`. */
export function canFinishInvoice(invoice: HealthcareInvoice, permissions: string[]): Decision {
  if (!permissions.includes("healthcare_invoices.edit")) {
    return {
      allowed: false,
      reason: "Só o admin fecha fatura de convênio. Admin de clínica consulta, mas não altera.",
    };
  }

  if (invoice.status === "generated_invoice") {
    return {
      allowed: false,
      reason:
        "O lote desta fatura já foi gerado. Alterar depois do envio faz o que a clínica vê divergir do que a operadora recebeu.",
    };
  }

  const missing = missingInvoiceFields(invoice);
  if (missing.length > 0) {
    return {
      allowed: false,
      reason: `Falta preencher: ${missing.join(", ")}. São os identificadores com que a operadora reconhece o lote.`,
    };
  }

  if (billableLines(invoice).length === 0) {
    return {
      allowed: false,
      reason: "Nenhuma autorização do período teve atendimento realizado. Não há o que faturar.",
    };
  }

  return { allowed: true };
}

export function missingInvoiceFields(invoice: HealthcareInvoice): string[] {
  const missing: string[] = [];
  if (!invoice.number?.trim()) missing.push("número");
  if (!invoice.protocol?.trim()) missing.push("protocolo");
  if (!invoice.igdr?.trim()) missing.push("IGDR");
  return missing;
}

/* ============================================================== operadora */

/**
 * O que falta na operadora para o TISS funcionar.
 *
 * Os dois códigos não são validados no changeset do monólito — são opcionais no
 * schema e obrigatórios na prática, porque o lote os usa. Um cadastro sem eles
 * passa e falha depois, na geração do XML.
 */
export function missingTissSetup(invoice: HealthcareInvoice): string[] {
  const missing: string[] = [];
  if (!invoice.healthCare.providerCode?.trim()) missing.push("código do prestador");
  if (!invoice.healthCare.requesterCode?.trim()) missing.push("código do solicitante");
  return missing;
}
