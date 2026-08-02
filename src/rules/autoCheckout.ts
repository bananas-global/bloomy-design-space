import type { Rule } from "@brucesantos/design-space";
import type { AutoCheckoutData, OpenPresence } from "../contracts/index.js";

/**
 * Regras da saída automática.
 *
 * `AutoCheckout` fecha os check-ins que ficaram abertos:
 *
 * ```elixir
 * from(sr in ServiceRecord, where: is_nil(sr.checkout_at))
 * |> Repo.update_all(set: [checkout_at: DateTime.utc_now(), checkout_done_by: "system"])
 * ```
 *
 * Não há filtro de data. **Nenhum.**
 */
export const autoCheckoutRules: Rule[] = [
  {
    id: "auto-checkout-has-no-date-filter",
    statement:
      "A rotina fecha todo check-in sem saída, de qualquer dia da história, carimbando a hora em que ela rodou. Um check-in de três meses atrás ganha uma saída de hoje.",
    rationale:
      "A intenção — limpar a lista de quem está na clínica — é boa, e a rotina das 23h dá conta do dia corrente. O efeito é que a duração da presença vira absurdo para tudo que sobrou de trás: uma noite em que o worker falhou, uma importação, um ambiente novo. O registro passa a dizer que a criança ficou noventa dias na unidade.",
    source: "src/rules/autoCheckout.ts",
  },
  {
    id: "the-system-signs-its-own-checkout",
    statement:
      "A rotina grava `checkout_done_by: \"system\"`. É a única parte honesta da operação: dá para distinguir o que ela fechou do que uma pessoa fechou.",
    rationale:
      "Vale preservar explicitamente. Sem essa marca, um registro fechado pela rotina seria indistinguível de um fechado por alguém — e a duração absurda pareceria erro de quem estava no balcão.",
    source: "src/rules/autoCheckout.ts",
  },
];

function hoursBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000;
}

/** Quanto tempo o registro vai afirmar que a pessoa ficou na clínica. */
export function statedDurationHours(record: OpenPresence, runsAt: string): number {
  return Math.max(0, Math.round(hoursBetween(record.checkinAt, record.checkoutAt ?? runsAt)));
}

/**
 * Implementação de `auto-checkout-has-no-date-filter`.
 *
 * O critério é **atravessar o dia**, e não um número de horas.
 *
 * A primeira versão usava “mais de 12 horas” e teria acusado operação normal: a
 * rotina roda às 23h todo dia, então um check-in das 08h que ninguém fechou é
 * encerrado com 15 horas — o worker fazendo exatamente o que deve. O que não é
 * normal é a saída cair num dia diferente da entrada.
 */
export function absurdDuration(record: OpenPresence, runsAt: string): boolean {
  const entrada = record.checkinAt.slice(0, 10);
  const saida = (record.checkoutAt ?? runsAt).slice(0, 10);
  return saida !== entrada;
}

export function willBecomeAbsurd(data: AutoCheckoutData): OpenPresence[] {
  return data.records.filter(
    (record) => record.checkoutAt === undefined && absurdDuration(record, data.runsAt),
  );
}

/** Os que a rotina fecha sem estragar nada — de hoje mesmo. */
export function closedCleanly(data: AutoCheckoutData): OpenPresence[] {
  return data.records.filter(
    (record) => record.checkoutAt === undefined && !absurdDuration(record, data.runsAt),
  );
}

/** Implementação de `the-system-signs-its-own-checkout`. */
export function closedByTheSystem(record: OpenPresence): boolean {
  return record.checkoutDoneBy === "system";
}

/** Em dias, para a frase não pedir divisão mental de quem lê. */
export function statedDurationLabel(record: OpenPresence, runsAt: string): string {
  const horas = statedDurationHours(record, runsAt);
  if (horas < 24) return `${horas} ${horas === 1 ? "hora" : "horas"}`;
  const dias = Math.round(horas / 24);
  return `${dias} ${dias === 1 ? "dia" : "dias"}`;
}
