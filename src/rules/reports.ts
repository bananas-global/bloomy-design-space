import type { Rule } from "@brucesantos/design-space";
import type { PatientReport, ReportType } from "../contracts/index.js";

/**
 * Regras dos relatórios.
 *
 * Sete tipos que saem por um botão só. O que muda entre eles não é o formato: é
 * para onde o documento vai depois de gerado — empregador, convênio, família,
 * outro serviço de saúde. Um relatório é a coisa mais fácil de o produto emitir
 * e a mais difícil de recolher.
 *
 * Traduzidas de `Reports.Report` e `PatientPolicy.can?(role, :generate_report)`.
 */
export const reportRules: Rule[] = [
  {
    id: "report-type-decides-the-destination",
    statement:
      "Cada tipo de relatório tem um destinatário fora da clínica, e o conteúdo apropriado muda com ele.",
    rationale:
      "A declaração de comparecimento vai para o empregador de quem trouxe a criança; o relatório de evolução vai para o convênio ou para outro serviço de saúde. Tratar os sete como “relatório” faz sair informação clínica em documento que ia para o RH de uma empresa.",
    source: "src/rules/reports.ts",
  },
  {
    id: "attendance-declaration-carries-no-clinical-content",
    statement:
      "A declaração de comparecimento leva data, horário de entrada e saída e o nome do responsável. Não leva conteúdo clínico.",
    rationale:
      "É o único tipo que sai para fora da saúde. O que ela precisa provar é que a pessoa esteve na clínica naquele horário — nada além disso deveria caber nela.",
    source: "src/rules/reports.ts",
  },
  {
    id: "generated-report-is-frozen",
    statement:
      "Relatório com PDF gerado não é editado. Corrigir exige cancelar e emitir outro.",
    rationale:
      "O documento já saiu da clínica. Editar o registro depois faz o que está no sistema divergir do papel que está na mão de alguém.",
    source: "src/rules/reports.ts",
  },
  {
    id: "issuing-does-not-check-reading",
    statement:
      "A permissão de emitir relatório não verifica a permissão de ler o prontuário. Quem pode emitir, emite qualquer um dos sete tipos.",
    rationale:
      "`generate_report` inclui a recepção, e `see_clinic_overview` a exclui. Na prática, quem não pode abrir a evolução do paciente pode produzir um documento de evolução sobre ele — e o formulário não filtra o tipo por papel.",
    source: "src/rules/reports.ts",
  },
];

/* ================================================================= tipos */

const TYPE_LABEL: Record<ReportType, string> = {
  normal: "Relatório",
  declaration_of_attendance: "Declaração de comparecimento",
  protocol_report: "Relatório de protocolo",
  evolution_report: "Relatório evolutivo",
  pei: "Relatório de PEI",
  health_care_report: "Relatório para operadora",
  external_report: "Relatório externo",
};

export function reportTypeLabel(type: ReportType): string {
  return TYPE_LABEL[type];
}

/**
 * Implementação de `report-type-decides-the-destination`.
 *
 * O destinatário não está no schema — é conhecimento do domínio que o Design
 * Space acrescenta. Está aqui porque é o que decide o cuidado com o conteúdo, e
 * porque um handoff sem isso produz sete telas iguais.
 */
export function destination(type: ReportType): { who: string; carriesClinicalContent: boolean } {
  switch (type) {
    case "declaration_of_attendance":
      return {
        who: "o empregador de quem trouxe a criança, ou a escola",
        carriesClinicalContent: false,
      };
    case "health_care_report":
      return { who: "a operadora, junto da autorização", carriesClinicalContent: true };
    case "external_report":
      return {
        who: "outro serviço de saúde — neurologia, psiquiatria, escola",
        carriesClinicalContent: true,
      };
    case "pei":
      return { who: "a família, e o convênio quando pedido", carriesClinicalContent: true };
    case "evolution_report":
      return { who: "a família e a operadora", carriesClinicalContent: true };
    case "protocol_report":
      return { who: "a família, na devolutiva", carriesClinicalContent: true };
    case "normal":
      return { who: "quem solicitou — registro interno por padrão", carriesClinicalContent: true };
  }
}

export function carriesClinicalContent(type: ReportType): boolean {
  return destination(type).carriesClinicalContent;
}

/* ============================================================ declaração */

/** Implementação de `attendance-declaration-carries-no-clinical-content`. */
export function missingAttendanceFields(report: PatientReport): string[] {
  if (report.reportType !== "declaration_of_attendance") return [];

  const missing: string[] = [];
  const attendance = report.attendance;
  if (!attendance?.date) missing.push("data do atendimento");
  if (!attendance?.startTime) missing.push("horário de entrada");
  if (!attendance?.endTime) missing.push("horário de saída");
  if (!attendance?.guardianName?.trim()) missing.push("nome do responsável");
  return missing;
}

/**
 * A declaração leva conteúdo clínico por engano?
 *
 * Não existe no monólito — o campo `content` simplesmente aceita qualquer coisa
 * em qualquer tipo. Esta função é o aviso que a tela precisa dar antes de gerar
 * o PDF, porque é o único tipo que sai do circuito da saúde.
 */
export function attendanceHasClinicalContent(report: PatientReport): boolean {
  if (report.reportType !== "declaration_of_attendance") return false;
  return (report.content?.trim().length ?? 0) > 0;
}

/* =============================================================== emissão */

type Decision = { allowed: boolean; reason?: string };

/** Quem pode emitir, de `PatientPolicy.can?(role, :generate_report)`. */
export const CAN_ISSUE = [
  "admin",
  "clinic_admin",
  "coordinator",
  "supervisor",
  "therapeutic_companion",
  "specialist",
  "attendant",
];

/** Quem alcança a visão clínica, de `see_clinic_overview` (lista negativa). */
const CAN_READ_CLINICAL = CAN_ISSUE.filter((role) => role !== "attendant");

/**
 * Emitir depende do papel e **não do tipo** — é assim no monólito, e é o ponto
 * da regra `issuing-does-not-check-reading`. A assinatura não recebe o tipo de
 * propósito: recebê-lo sugeriria uma verificação que não existe.
 */
export function canIssue(role: string): Decision {
  if (!CAN_ISSUE.includes(role)) {
    return { allowed: false, reason: "Seu perfil não emite relatórios." };
  }
  return { allowed: true };
}

/**
 * Implementação de `issuing-does-not-check-reading`.
 *
 * Devolve o descompasso, e não uma proibição: no sistema real a emissão
 * acontece. O Design Space o torna visível para a decisão ser tomada de
 * propósito, em vez de herdada.
 */
export function issuingWithoutReading(type: ReportType, role: string): string | undefined {
  if (!CAN_ISSUE.includes(role)) return undefined;
  if (!carriesClinicalContent(type)) return undefined;
  if (CAN_READ_CLINICAL.includes(role)) return undefined;

  return `Este perfil pode emitir um ${reportTypeLabel(type).toLowerCase()} e não alcança a visão clínica do paciente. A permissão de emitir não verifica a de ler.`;
}

/** Implementação de `generated-report-is-frozen`. */
export function canEditReport(report: PatientReport): Decision {
  if (report.status === "generated_pdf") {
    return {
      allowed: false,
      reason:
        "O PDF já foi gerado e o documento saiu da clínica. Cancele e emita outro — editar faria o sistema divergir do papel que está na mão de alguém.",
    };
  }
  if (report.status === "cancelled") {
    return { allowed: false, reason: "Este relatório foi cancelado." };
  }
  return { allowed: true };
}

export function canGeneratePdf(report: PatientReport): Decision {
  if (report.status !== "elaboration") {
    return {
      allowed: false,
      reason:
        report.status === "generated_pdf"
          ? "O PDF deste relatório já foi gerado."
          : "Relatório cancelado não gera PDF.",
    };
  }

  const missing = missingAttendanceFields(report);
  if (missing.length > 0) {
    return {
      allowed: false,
      reason: `Falta ${missing.join(", ")}. A declaração precisa provar que a pessoa esteve na clínica naquele horário.`,
    };
  }

  return { allowed: true };
}

export function statusLabel(status: PatientReport["status"]): string {
  return {
    elaboration: "Em elaboração",
    generated_pdf: "PDF gerado",
    cancelled: "Cancelado",
  }[status];
}
