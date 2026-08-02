import type { Rule } from "@brucesantos/design-space";
import type {
  Anamnese,
  PatientDocument,
  PatientDocumentType,
  PatientRecord,
} from "../contracts/index.js";

/**
 * Regras do prontuário.
 *
 * Substituem o modelo de "prontuário restrito" que este repositório tinha, e
 * que era invenção: um booleano no paciente e uma permissão que não existe. O
 * real é mais interessante e mais rígido — a restrição é por **tipo de
 * documento**, e dois dos três tipos não são visíveis para ninguém.
 *
 * Traduzidas de `Patients.Document`, `Anamneses.Anamnese` e
 * `Patients.AlertCriteria`.
 */
export const recordRules: Rule[] = [
  {
    id: "only-clinical-documents-are-visible",
    statement:
      "Só documento clínico é visível pela interface, e apenas para sete dos dez papéis. Documento pessoal e administrativo não são abertos por ninguém.",
    rationale:
      "`PatientPolicy.can?/3` tem cláusula permissiva apenas para `:clinical`; os outros dois caem no `false` final. A tela precisa dizer que o documento existe e não pode ser aberto — esconder a existência faria a recepção pedir de novo o que já foi entregue.",
    source: "src/rules/record.ts",
  },
  {
    id: "documents-warn-before-expiring",
    statement:
      "Documento com validade avisa antes de vencer, pelo número de dias configurado nele mesmo.",
    rationale:
      "Laudo vencido interrompe autorização e para o atendimento. O prazo de aviso é por documento porque renovar um laudo neurológico demora meses e uma carteirinha, dias.",
    source: "src/rules/record.ts",
  },
  {
    id: "anamnese-cannot-finish-incomplete",
    statement:
      "A anamnese não pode ser finalizada enquanto os quatro campos de comportamento estiverem em branco.",
    rationale:
      "São os campos que orientam a primeira sessão. O modo como o monólito impõe isso é o problema: em vez de recusar, ele devolve o status para pendente — quem clicou em finalizar recebe sucesso e vê a anamnese aberta, sem saber por quê.",
    source: "src/rules/record.ts",
  },
  {
    id: "absence-alerts-are-per-patient",
    statement:
      "Os limites de falta são configurados por paciente, não pela clínica: faltas seguidas, faltas no total e mínimo de sessões.",
    rationale:
      "Uma criança em adaptação tolera mais faltas que outra em manutenção. Um limite único da clínica dispara alarme falso na primeira e chega tarde na segunda.",
    source: "src/rules/record.ts",
  },
];

/* ============================================================ documentos */

/** Implementação de `only-clinical-documents-are-visible`. */
const CAN_VIEW_CLINICAL = [
  "admin",
  "clinic_admin",
  "attendant",
  "coordinator",
  "operation",
  "therapeutic_companion",
  "supervisor",
];

type Decision = { allowed: boolean; reason?: string };

export function canViewDocument(document: PatientDocument, role: string): Decision {
  if (document.type !== "clinical") {
    return {
      allowed: false,
      reason: `Documento ${documentTypeLabel(document.type)} não é aberto pela interface, em nenhum perfil. Peça à coordenação por outro canal.`,
    };
  }

  if (!CAN_VIEW_CLINICAL.includes(role)) {
    return {
      allowed: false,
      reason:
        "Seu perfil não abre documento clínico. Especialista, aplicador e People ficam de fora.",
    };
  }

  return { allowed: true };
}

export function documentTypeLabel(type: PatientDocumentType): string {
  return { clinical: "clínico", personal: "pessoal", administrative: "administrativo" }[type];
}

/**
 * Implementação de `documents-warn-before-expiring`.
 *
 * Devolve `expired`, `warning` ou `valid`. O aviso começa `alertLeadDays` antes
 * do vencimento; sem o campo, não há aviso antecipado — só o vencimento.
 */
export function documentValidity(
  document: PatientDocument,
  now: string,
): { state: "valid" | "warning" | "expired" | "undated"; daysLeft?: number } {
  if (!document.validUntil) return { state: "undated" };

  const end = Date.parse(`${document.validUntil}T00:00:00.000-03:00`);
  const today = Date.parse(`${now.slice(0, 10)}T00:00:00.000-03:00`);
  const daysLeft = Math.round((end - today) / 86_400_000);

  if (daysLeft < 0) return { state: "expired", daysLeft };

  const lead = document.alertLeadDays;
  if (lead !== undefined && daysLeft <= lead) return { state: "warning", daysLeft };

  return { state: "valid", daysLeft };
}

/** Documentos que exigem ação agora, em ordem de urgência. */
export function documentsNeedingAttention(record: PatientRecord): PatientDocument[] {
  return record.documents
    .map((document) => ({ document, validity: documentValidity(document, record.now) }))
    .filter((item) => item.validity.state === "expired" || item.validity.state === "warning")
    .sort((a, b) => (a.validity.daysLeft ?? 0) - (b.validity.daysLeft ?? 0))
    .map((item) => item.document);
}

/* ============================================================== anamnese */

const REQUIRED_BEHAVIORS: { key: keyof Anamnese["behaviors"]; label: string }[] = [
  { key: "usesBottle", label: "usa mamadeira" },
  { key: "sucksThumb", label: "chupa o dedo" },
  { key: "sittingPositionAtHome", label: "posição sentada em casa" },
  { key: "usesScreenDevices", label: "uso de telas" },
];

export function missingBehaviors(anamnese: Anamnese): string[] {
  return REQUIRED_BEHAVIORS.filter(({ key }) => {
    const value = anamnese.behaviors[key];
    return value === undefined || value.trim() === "";
  }).map(({ label }) => label);
}

/**
 * Implementação de `anamnese-cannot-finish-incomplete`.
 *
 * Aqui a regra recusa com motivo, que é o que o Design Space propõe. O monólito
 * faz diferente e pior: `keep_pending_until_required_fields/1` devolve o status
 * para `pending` dentro do changeset, sem erro. A operação "finaliza" com
 * sucesso e a anamnese continua aberta, sem nada na tela explicando.
 *
 * A divergência é deliberada e está registrada como achado no log do porte.
 */
export function canFinishAnamnese(anamnese: Anamnese): Decision {
  if (anamnese.status === "finished") {
    return { allowed: false, reason: "Esta anamnese já está finalizada." };
  }

  const missing = missingBehaviors(anamnese);
  if (missing.length > 0) {
    return {
      allowed: false,
      reason: `Falta responder: ${missing.join(", ")}. São os campos que orientam a primeira sessão.`,
    };
  }

  return { allowed: true };
}

/**
 * O que o monólito faz hoje ao tentar finalizar.
 *
 * Existe para o cenário poder mostrar os dois comportamentos lado a lado: o
 * atual, que finge sucesso, e o proposto, que recusa com motivo. Sem isso, a
 * engenharia leria a regra como descrição do que já existe.
 */
export function currentMonolithBehaviour(anamnese: Anamnese): {
  reportedSuccess: boolean;
  resultingStatus: Anamnese["status"];
} {
  const incomplete = missingBehaviors(anamnese).length > 0;
  return {
    reportedSuccess: true,
    resultingStatus: incomplete ? "pending" : "finished",
  };
}

/* =============================================================== alertas */

/** Implementação de `absence-alerts-are-per-patient`. */
export function absenceAlerts(record: PatientRecord): string[] {
  const criteria = record.alertCriteria;
  if (!criteria) return [];

  const alerts: string[] = [];
  const { consecutiveAbsences, absences, sessions } = record.attendance;

  if (consecutiveAbsences >= criteria.maximumConsecutiveAbsences) {
    alerts.push(
      `${consecutiveAbsences} faltas seguidas, e o limite deste paciente é ${criteria.maximumConsecutiveAbsences}.`,
    );
  }

  if (absences >= criteria.maximumAbsences) {
    alerts.push(
      `${absences} faltas no período, e o limite deste paciente é ${criteria.maximumAbsences}.`,
    );
  }

  if (sessions < criteria.requiredSessionCount) {
    alerts.push(
      `${sessions} sessões realizadas, abaixo das ${criteria.requiredSessionCount} que o plano deste paciente prevê.`,
    );
  }

  return alerts;
}

export function hasCriteria(record: PatientRecord): boolean {
  return record.alertCriteria !== undefined;
}
