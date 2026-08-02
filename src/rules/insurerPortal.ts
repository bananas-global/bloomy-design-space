import type { Rule } from "@brucesantos/design-space";
import type { AttendanceRow, InsurerPortalData, ScheduleStatus } from "../contracts/index.js";

/**
 * Regras do portal da operadora.
 *
 * É o único lugar do produto em que dados de uma clínica são mostrados a uma
 * organização de fora. Isso torna o escopo a regra mais importante do módulo —
 * e o que **não** é mostrado tão projetado quanto o que é.
 *
 * Traduzidas dos três `scope/2` que recebem `Bloomy.HealthCares.User`, em
 * `PatientPolicy`, `SchedulePolicy` e `CustomServicePolicy`.
 */
export const insurerPortalRules: Rule[] = [
  {
    id: "insurer-sees-only-its-own-beneficiaries",
    statement:
      "A operadora alcança apenas pacientes que têm um plano dela, e apenas os atendimentos desses pacientes.",
    rationale:
      "O vínculo é o plano, não a clínica. É por isso que um paciente some da lista quando troca de convênio, mesmo continuando em atendimento.",
    source: "src/rules/insurerPortal.ts",
  },
  {
    id: "incomplete-schedules-are-hidden-from-the-insurer",
    statement:
      "Agendamentos com situação Incompleto não aparecem para a operadora. O filtro é silencioso: nada indica que algo foi omitido.",
    rationale:
      "Esconder rascunho de agendamento é defensável. Esconder sem dizer que existe omissão é o que torna a lista de presença impossível de conciliar quando os números não batem.",
    source: "src/rules/insurerPortal.ts",
  },
  {
    id: "insurer-sees-attendance-not-clinical-record",
    statement:
      "A operadora vê que o atendimento aconteceu, quem conduziu e quando. Não vê evolução, tentativas, programas nem protocolo.",
    rationale:
      "O que a operadora precisa conferir é a prestação do serviço. O conteúdo clínico é do paciente e da clínica — e mandá-lo junto seria entregar mais do que a cobrança exige.",
    source: "src/rules/insurerPortal.ts",
  },
  {
    id: "attendance-list-counts-only-what-happened",
    statement:
      "A lista de presença conta como realizado apenas o que chegou a Finalizado. Falta, cancelamento e pendência aparecem, e não contam.",
    rationale:
      "É o documento que sustenta a cobrança. Contar como realizado um atendimento pendente de assinatura antecipa uma prestação que ainda não fechou.",
    source: "src/rules/insurerPortal.ts",
  },
];

/* ================================================================ escopo */

/**
 * Implementação de `insurer-sees-only-its-own-beneficiaries`.
 *
 * O escopo real é uma junção com `Patients.Plan` filtrando por
 * `health_care_id`. Aqui a fixture já vem recortada — o que esta função faz é
 * dar nome à regra e permitir que a tela explique por que alguém não está na
 * lista.
 */
export function isBeneficiary(data: InsurerPortalData, patientId: string): boolean {
  return data.patients.some((item) => item.patient.id === patientId);
}

/* ============================================================= presença */

/**
 * Situações que contam como atendimento prestado.
 *
 * Implementação de `attendance-list-counts-only-what-happened`. Apenas
 * `finished`: um atendimento pendente de registro ou de assinatura aconteceu de
 * fato, mas ainda não fechou — e antecipar a contagem é antecipar a cobrança.
 */
const DELIVERED: ScheduleStatus[] = ["finished"];

export function wasDelivered(row: AttendanceRow): boolean {
  return DELIVERED.includes(row.status);
}

/** Situações em que o paciente não foi atendido, e por quê. */
export function notDeliveredReason(row: AttendanceRow): string | undefined {
  switch (row.status) {
    case "finished":
      return undefined;
    case "missed":
      return "Paciente faltou";
    case "cancelled":
      return "Cancelado";
    case "pending_register":
      return "Realizado, aguardando registro da evolução";
    case "pending_signature":
      return "Realizado, aguardando assinatura de quem atendeu";
    case "pending_supervisor_signature":
      return "Realizado, aguardando assinatura do supervisor";
    case "ongoing":
      return "Em andamento agora";
    default:
      return "Não realizado";
  }
}

/**
 * O resumo do período.
 *
 * `pendingClosure` é a contagem que evita a conversa mais desagradável entre
 * clínica e operadora: atendimentos que aconteceram e ainda não fecharam. Eles
 * não contam como prestados hoje, e vão contar assim que a assinatura sair.
 */
export function attendanceSummary(data: InsurerPortalData): {
  delivered: number;
  pendingClosure: number;
  missed: number;
  cancelled: number;
  total: number;
} {
  const rows = data.attendance;
  const pendingStatuses: ScheduleStatus[] = [
    "pending_register",
    "pending_signature",
    "pending_supervisor_signature",
  ];

  return {
    delivered: rows.filter(wasDelivered).length,
    pendingClosure: rows.filter((row) => pendingStatuses.includes(row.status)).length,
    missed: rows.filter((row) => row.status === "missed").length,
    cancelled: rows.filter((row) => row.status === "cancelled").length,
    total: rows.length,
  };
}

/**
 * Implementação de `incomplete-schedules-are-hidden-from-the-insurer`.
 *
 * Devolve quantos agendamentos do período o escopo omitiu. O monólito não expõe
 * esse número — nem para a clínica, nem para a operadora. Este Design Space o
 * mostra para que a decisão de escondê-los seja discutida em vez de herdada.
 */
export function hiddenFromInsurer(data: InsurerPortalData): number {
  return data.hiddenIncompleteCount;
}

/**
 * O que a operadora nunca vê, dito por extenso.
 *
 * Existe como função, e não como texto solto na tela, porque é uma decisão de
 * privacidade que precisa sobreviver a uma reescrita de layout.
 */
export const NOT_SHARED_WITH_INSURER = [
  "a evolução escrita da sessão",
  "as tentativas registradas nos programas",
  "o plano de intervenção e suas metas",
  "as respostas de protocolo de avaliação",
] as const;
