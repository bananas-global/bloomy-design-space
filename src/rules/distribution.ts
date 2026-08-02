import type { Rule } from "@brucesantos/design-space";
import type { DistributedSchedule, DistributionData } from "../contracts/index.js";

/**
 * Regras da distribuição de guias.
 *
 * `Authorizations.Distributor` decide **qual guia paga qual atendimento**. Ele
 * ordena os atendimentos do dia por horário e vai consumindo os pacotes até
 * acabar:
 *
 * ```elixir
 * schedules
 * |> Enum.sort_by(& &1.start_time, DateTime)
 * |> Enum.reduce(initial_state, &distribute_schedule/2)
 * ```
 */
export const distributionRules: Rule[] = [
  {
    id: "the-clock-decides-who-gets-paid",
    statement:
      "A distribuição percorre os atendimentos em ordem de horário. Quando o saldo do pacote é menor que a demanda do dia, quem é atendido de manhã fica com guia e quem é atendido à tarde fica sem.",
    rationale:
      "Não é critério clínico nem de urgência: é a ordem do relógio. Pode até ser a regra certa — é previsível e não exige julgamento —, mas ninguém a escolheu, e ela decide qual atendimento a clínica vai conseguir cobrar.",
    source: "src/rules/distribution.ts",
  },
  {
    id: "the-list-of-unpaid-is-computed-and-discarded",
    statement:
      "O distribuidor acumula `skipped_schedule_ids` e devolve a lista no resultado. O worker chama `Distributor.run()` e ignora o retorno inteiro.",
    rationale:
      "O sistema sabe exatamente quais atendimentos do dia não têm guia — a informação existe, formada, no instante em que a decisão é tomada. Descartá-la significa descobrir a perda no fechamento do mês, quando não dá mais para pedir autorização.",
    source: "src/rules/distribution.ts",
  },
];

/** Implementação de `the-list-of-unpaid-is-computed-and-discarded`. */
export function withoutAuthorization(data: DistributionData): DistributedSchedule[] {
  return data.schedules.filter((schedule) => schedule.authorizationCode === undefined);
}

/** O valor que a clínica não vai conseguir cobrar deste dia. */
export function unbillableCents(data: DistributionData): number {
  return withoutAuthorization(data).reduce(
    (total, schedule) => total + schedule.amountCents,
    0,
  );
}

/**
 * Implementação de `the-clock-decides-who-gets-paid`.
 *
 * Devolve o horário a partir do qual o saldo acabou. `undefined` quando todos
 * couberam — aí não houve corte e falar em corte seria inventar.
 */
export function cutoffTime(data: DistributionData): string | undefined {
  const emOrdem = [...data.schedules].sort((a, b) => a.start.localeCompare(b.start));
  const primeiroSem = emOrdem.find((schedule) => schedule.authorizationCode === undefined);
  return primeiroSem?.start;
}

/**
 * Os atendimentos que teriam guia se a ordem fosse outra.
 *
 * Existe para tornar a arbitrariedade mensurável: são exatamente os que ficaram
 * de fora, e qualquer um deles poderia estar dentro.
 */
export function couldHaveBeenPaid(data: DistributionData): DistributedSchedule[] {
  return withoutAuthorization(data);
}

/** Saldo total com que o dia começou. */
export function startingBalance(data: DistributionData): number {
  return data.packages.reduce((total, entry) => total + entry.startingBalance, 0);
}

/** O dia pedia mais do que havia? É a pergunta que explica o resto. */
export function demandExceededBalance(data: DistributionData): boolean {
  return data.schedules.length > startingBalance(data);
}
