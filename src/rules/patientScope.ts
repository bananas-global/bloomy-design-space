import type { PatientScopeData, ScopeRule } from "../contracts/index.js";
import type { Rule } from "@brucesantos/design-space";

/**
 * Regras do escopo de pacientes.
 *
 * `PatientPolicy.scope/2` casa cláusulas na ordem. E `supervisor` aparece em
 * duas:
 *
 * ```elixir
 * def scope("supervisor", current_user) do          # linha 49 — esta roda
 *   unit_ids = Enum.map(current_user.units, & &1.id)
 *   from p in Patient, join: pu in assoc(p, :patient_units),
 *     where: pu.unit_id in ^unit_ids, ...
 * end
 *
 * def scope(role, current_user)                     # linha 59 — esta não
 *     when role in ~W(therapeutic_companion applicator supervisor specialist) do
 *   from p in Patient, join: s in assoc(p, :schedules),
 *     join: pr in assoc(s, :professionals),
 *     where: pr.user_id == ^current_user.id, ...
 * end
 * ```
 */
export const patientScopeRules: Rule[] = [
  {
    id: "supervisor-is-listed-in-a-clause-that-never-runs",
    statement:
      "`supervisor` aparece em duas cláusulas do escopo. A primeira, por unidade, é a que roda; a segunda continua listando o papel e diz outra coisa — que o supervisor veria só os pacientes das próprias agendas.",
    rationale:
      "As duas regras são defensáveis, e a diferença entre elas é grande: uma unidade inteira contra a própria lista. O problema não é qual foi escolhida, é que o código afirma as duas. Quem for conferir o alcance de acesso de um supervisor — numa auditoria, numa dúvida sobre sigilo — pode ler a linha errada e concluir o oposto do que acontece.",
    source: "src/rules/patientScope.ts",
  },
  {
    id: "seeing-nothing-is-written-as-an-impossible-condition",
    statement:
      "O papel de pessoas escreve “vê nenhum paciente” como uma busca por identificador nulo. O resultado é o certo; a intenção precisa ser deduzida.",
    rationale:
      "É uma decisão deliberada e correta escrita de um jeito que parece engano. Quem lê não sabe se alguém quis dizer “nenhum” ou se a condição está errada, e a diferença importa: uma é para manter, a outra é para consertar. Na dúvida, ninguém mexe — e a regra sobrevive sem nunca ter sido confirmada.",
    source: "src/rules/patientScope.ts",
  },
  {
    id: "an-unknown-role-raises-instead-of-seeing-everything",
    statement:
      "Não há cláusula final. Um papel que não casa com nenhuma derruba a chamada, em vez de devolver todos os pacientes.",
    rationale:
      "É o único lugar do sistema em que a falta de tratamento erra para o lado seguro, e vale registrar como acerto justamente para protegê-lo. A correção intuitiva — acrescentar um caso final que devolve `Patient` — transformaria um erro barulhento num vazamento silencioso: um papel novo passaria a ver a base inteira sem que ninguém decidisse isso.",
    source: "src/rules/patientScope.ts",
  },
];

/** As duas leituras possíveis do papel que aparece em duas cláusulas. */
export function contradictory(data: PatientScopeData): ScopeRule[] {
  return data.rules.filter((rule) => rule.shadowed !== undefined);
}

/** Quem enxerga a base inteira. */
export function seesEverything(data: PatientScopeData): ScopeRule[] {
  return data.rules.filter((rule) => rule.shape === "all");
}

/** Quem não enxerga ninguém. */
export function seesNobody(data: PatientScopeData): ScopeRule[] {
  return data.rules.filter((rule) => rule.shape === "empty");
}

/** O caso em que a chamada derruba, que é o comportamento seguro. */
export function raises(data: PatientScopeData): ScopeRule[] {
  return data.rules.filter((rule) => rule.shape === "raises");
}

/** Como dizer o alcance sem usar o vocabulário do banco. */
export function reachLabel(rule: ScopeRule): string {
  switch (rule.shape) {
    case "all":
      return "todos os pacientes da clínica";
    case "by-unit":
      return "todos os pacientes da unidade";
    case "by-own-schedules":
      return "só os pacientes das próprias agendas";
    case "by-link":
      return "só os pacientes ligados a quem entrou";
    case "empty":
      return "nenhum paciente";
    case "raises":
      return "a tela não abre";
  }
}

/** Quantos papéis o escopo trata explicitamente. */
export function rolesCovered(data: PatientScopeData): number {
  return data.rules.filter((rule) => rule.shape !== "raises").length;
}
