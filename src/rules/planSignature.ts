import type { PlanSignature, PlanSignatureData } from "../contracts/index.js";
import type { Rule } from "@brucesantos/design-space";

/**
 * Regras da assinatura do plano de intervenção comportamental.
 *
 * O plano descreve como a equipe responde ao comportamento da criança. O
 * responsável o aceita pelo portal, e a aceitação é registrada assim:
 *
 * ```elixir
 * |> BehaviorInterventionPlan.changeset(%{
 *      guardian_approved: true,
 *      legal_guardian_id: legal_guardian_id,
 *      signature: signature,
 *      signed_at: Date.utc_today()
 *    })
 * ```
 *
 * A assinatura vem da API do portal do responsável — quer dizer, de casa, no
 * horário em que a família tem tempo.
 */
export const planSignatureRules: Rule[] = [
  {
    id: "the-signature-date-is-stamped-in-utc",
    statement:
      "A data da assinatura do responsável é carimbada em UTC. Quem assina das 21h à meia-noite recebe no documento a data do dia seguinte.",
    rationale:
      "É a data de um consentimento sobre conduta clínica com uma criança — o tipo de campo que alguém vai conferir contra o prontuário, contra a autorização da operadora, ou numa auditoria. Um dia de diferença não parece erro de sistema: parece que alguém preencheu errado, ou que a assinatura foi colhida depois do combinado.",
    source: "src/rules/planSignature.ts",
  },
  {
    id: "the-window-is-exactly-when-families-sign",
    statement:
      "As três horas em que o carimbo erra são as três horas em que a família tem tempo de assinar. Aqui a janela não é caso de canto: é o horário principal.",
    rationale:
      "Nas telas internas a janela pega o fim do expediente e afeta pouca gente. No portal do responsável ela pega a noite, que é quando se lê documento de filho depois do trabalho. O mesmo defeito, na mesma quantidade de horas, atinge proporções completamente diferentes conforme quem está do outro lado.",
    source: "src/rules/planSignature.ts",
  },
  {
    id: "the-signature-can-predate-nothing-and-postdate-the-plan",
    statement:
      "O carimbo pode cair depois do fim do plano. Um plano que termina hoje, assinado às 22h, fica registrado como aceito num dia em que ele já não valia.",
    rationale:
      "É o caso que transforma um erro de um dia em contradição interna do documento: o registro afirma, ao mesmo tempo, que o plano acabou e que foi aceito depois disso. Quem for conferir não tem como saber qual das duas datas está errada.",
    source: "src/rules/planSignature.ts",
  },
];

const OFFSET_HORAS = 3;

/** A data que o sistema grava. */
export function storedDate(signature: PlanSignature): string {
  const d = new Date(`${signature.signedAt.slice(0, 19)}Z`);
  d.setUTCHours(d.getUTCHours() + OFFSET_HORAS);
  return d.toISOString().slice(0, 10);
}

/** A data em que a pessoa de fato assinou. */
export function actualDate(signature: PlanSignature): string {
  return signature.signedAt.slice(0, 10);
}

/**
 * Implementação de `the-signature-date-is-stamped-in-utc`.
 */
export function stampedOnTheWrongDay(data: PlanSignatureData): PlanSignature[] {
  return data.signatures.filter((s) => storedDate(s) !== actualDate(s));
}

export function stampedCorrectly(data: PlanSignatureData): PlanSignature[] {
  return data.signatures.filter((s) => storedDate(s) === actualDate(s));
}

/**
 * Implementação de `the-signature-can-postdate-the-plan`.
 *
 * O carimbo cai depois do fim do plano, e a assinatura de verdade não caía.
 */
export function signedAfterThePlanEnded(data: PlanSignatureData): PlanSignature[] {
  return data.signatures.filter(
    (s) => storedDate(s) > s.planEnd && actualDate(s) <= s.planEnd,
  );
}

/** A hora local da assinatura. */
export function signingHour(signature: PlanSignature): number {
  return Number(signature.signedAt.slice(11, 13));
}

/** Quantas assinaturas caem na faixa noturna, errando ou não. */
export function signedAtNight(data: PlanSignatureData): PlanSignature[] {
  return data.signatures.filter((s) => signingHour(s) >= 18);
}
