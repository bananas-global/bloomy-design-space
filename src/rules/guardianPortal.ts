import type { Rule } from "@brucesantos/design-space";
import type { GuardianPlan, GuardianPortalData } from "../contracts/index.js";

/**
 * Regras do portal do responsável legal.
 *
 * Duas coisas acontecem aqui e em nenhum outro lugar do produto: a família
 * consente com o plano terapêutico do filho, e aceita os termos de uso. Os dois
 * são atos formais, e as regras existem para que o registro deles resista a ser
 * contestado meses depois.
 *
 * Traduzidas de `BehaviorInterventionPlans.accept/3`, `get_for_legal_guardian!`,
 * `validate_no_overlap` e `LegalGuardians.TermOfUseAcception`.
 */
export const guardianPortalRules: Rule[] = [
  {
    id: "plan-acceptance-records-who-when-and-what",
    statement:
      "Aceitar o plano grava, no mesmo ato, a aprovação, a assinatura digitada, a data e qual responsável assinou.",
    rationale:
      "É um consentimento sobre o que vai ser ensinado a uma criança. Guardar só um booleano deixaria a clínica sem como mostrar quem concordou, com o quê e quando.",
    source: "src/rules/guardianPortal.ts",
  },
  {
    id: "plan-is-visible-only-to-its-guardian",
    statement:
      "Um responsável só alcança os planos dos pacientes sob a responsabilidade dele. O escopo é por vínculo, não por link.",
    rationale:
      "O plano descreve comportamento e dificuldades de uma criança. Um identificador adivinhado não pode abrir o plano de outra família.",
    source: "src/rules/guardianPortal.ts",
  },
  {
    id: "expired-plan-cannot-be-accepted",
    statement:
      "Plano vencido não recebe aceite. O que estava para ser consentido já deixou de valer.",
    rationale:
      "Assinar em agosto um plano que terminou em junho produz um consentimento sobre nada — e um registro que parece válido em auditoria.",
    source: "src/rules/guardianPortal.ts",
  },
  {
    id: "plans-cannot-overlap-for-a-patient",
    statement:
      "Dois planos do mesmo paciente não podem ter vigências sobrepostas.",
    rationale:
      "Com dois planos válidos ao mesmo tempo, fica indefinido qual programa o terapeuta aplica e qual consentimento vale.",
    source: "src/rules/guardianPortal.ts",
  },
  {
    id: "terms-acceptance-records-context",
    statement:
      "O aceite dos termos guarda o instante, o endereço de rede e o dispositivo usado.",
    rationale:
      "Não é telemetria: é o que sustenta o consentimento se alguém contestar depois. Um `accepted_at` sozinho não distingue aceite da pessoa de aceite de quem pegou o celular dela.",
    source: "src/rules/guardianPortal.ts",
  },
];

type Decision = { allowed: boolean; reason?: string };

/* ============================================================= consentir */

/**
 * Implementação de `expired-plan-cannot-be-accepted` e
 * `plan-is-visible-only-to-its-guardian`.
 *
 * A ordem das verificações é do mais estrutural para o mais circunstancial:
 * quem não deveria estar vendo o plano recebe a negativa antes de qualquer
 * informação sobre a validade dele — inclusive antes de saber que ele venceu.
 */
export function canAcceptPlan(
  plan: GuardianPlan,
  data: GuardianPortalData,
): Decision {
  const isOwn = data.patients.some((patient) => patient.id === plan.patient.id);
  if (!isOwn) {
    return {
      allowed: false,
      reason: "Este plano não é de um paciente sob sua responsabilidade.",
    };
  }

  if (plan.guardianApproved) {
    return {
      allowed: false,
      reason: `Você já aceitou este plano${plan.signedAt ? ` em ${br(plan.signedAt)}` : ""}.`,
    };
  }

  if (isExpired(plan, data.now)) {
    return {
      allowed: false,
      reason: `A vigência deste plano terminou em ${br(plan.endAt)}. Fale com a coordenação: um plano vencido não recebe aceite, e um novo precisa ser montado.`,
    };
  }

  return { allowed: true };
}

/**
 * Vencido é o que já passou da data final **ou** o que o sistema marcou.
 *
 * O monólito guarda um booleano `expired` além das datas, e as duas fontes
 * podem discordar — a marcação é feita por rotina e a data está sempre lá.
 * Considerar qualquer uma delas é a leitura conservadora, e a única que não
 * deixa passar aceite em plano encerrado.
 */
export function isExpired(plan: GuardianPlan, now: string): boolean {
  return plan.expired || plan.endAt < now.slice(0, 10);
}

/**
 * Implementação de `plan-acceptance-records-who-when-and-what`.
 *
 * Devolve o registro completo do aceite, e não um booleano. A função existe para
 * fixar que os quatro dados são gravados juntos: separar a assinatura da data,
 * ou a data de quem assinou, produz um consentimento que não sustenta auditoria.
 */
export function acceptPlan(
  plan: GuardianPlan,
  guardianId: string,
  signature: string,
  today: string,
): { ok: true; plan: GuardianPlan } | { ok: false; reason: string } {
  const trimmed = signature.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "Digite seu nome completo para assinar." };
  }

  return {
    ok: true,
    plan: {
      ...plan,
      guardianApproved: true,
      signature: trimmed,
      signedAt: today.slice(0, 10),
      signedByGuardianId: guardianId,
    },
  };
}

/* ============================================================ vigências */

/**
 * Implementação de `plans-cannot-overlap-for-a-patient`, espelhando
 * `validate_no_overlap/2`.
 *
 * Duas vigências se sobrepõem quando cada uma começa antes de a outra terminar.
 * A comparação é inclusiva nas duas pontas: dois planos que se encostam no mesmo
 * dia estão sobrepostos naquele dia.
 */
export function overlappingPlans(
  plans: GuardianPlan[],
  candidate: { patientId: string; startAt: string; endAt: string; excludeId?: string },
): GuardianPlan[] {
  return plans.filter(
    (plan) =>
      plan.patient.id === candidate.patientId &&
      plan.id !== candidate.excludeId &&
      plan.startAt <= candidate.endAt &&
      candidate.startAt <= plan.endAt,
  );
}

/* ================================================================ termos */

/** Implementação de `terms-acceptance-records-context`. */
export function missingTermsContext(acceptance: GuardianPortalData["termsAcceptance"]): string[] {
  if (!acceptance) return ["instante", "endereço de rede", "dispositivo"];

  const missing: string[] = [];
  if (!acceptance.acceptedAt) missing.push("instante");
  if (!acceptance.ipAddress?.trim()) missing.push("endereço de rede");
  if (!acceptance.device?.trim()) missing.push("dispositivo");
  return missing;
}

export function hasAcceptedTerms(data: GuardianPortalData): boolean {
  return data.termsAcceptance !== undefined;
}

/* ================================================================ agenda */

/**
 * Os atendimentos que a família vê.
 *
 * Cancelado continua na lista, marcado. Sumir com o horário cancelado faria a
 * família descobrir o cancelamento chegando na clínica.
 */
export function upcomingSchedules(data: GuardianPortalData): GuardianPortalData["schedules"] {
  return [...data.schedules]
    .filter((schedule) => schedule.start >= data.now.slice(0, 10))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Quantos planos ainda esperam o aceite da família. */
export function plansAwaitingAcceptance(data: GuardianPortalData): GuardianPlan[] {
  return data.plans.filter(
    (plan) =>
      !plan.guardianApproved &&
      !isExpired(plan, data.now) &&
      data.patients.some((patient) => patient.id === plan.patient.id),
  );
}

function br(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
