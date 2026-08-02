import type { Rule } from "@brucesantos/design-space";
import type { ClosureCandidate, ClosureGenerationData } from "../contracts/index.js";

/**
 * Regras da geração mensal de fechamentos.
 *
 * `GenerateMonthlyClosuresWorker` roda na virada do mês, procura quem tem
 * registro de horas no mês anterior e gera um fechamento para cada. Três
 * decisões dessa rotina têm consequência em dinheiro.
 */
export const closureGenerationRules: Rule[] = [
  {
    id: "deactivation-on-the-first-loses-the-month-worked",
    statement:
      "O worker mensal filtra `p.status == true`. O de desativação cobre esse buraco gerando o fechamento — mas do mês da **data de desativação**, não do mês trabalhado. Quando a desativação cai no dia 1º, o mês que acabou fica sem fechamento e o que começou ganha um vazio.",
    rationale:
      "Os dois workers juntos resolvem o caso comum: quem sai no dia 28 recebe o fechamento daquele mês. O caso que escapa é estreito e silencioso — uma data de desativação no primeiro dia do mês seguinte, que é como se registra “trabalhou até o fim de julho”.",
    source: "src/rules/closureGeneration.ts",
  },
  {
    id: "the-worker-reports-success-with-failures-inside",
    statement:
      "O worker conta sucessos e falhas e devolve `{:ok, ...}` de qualquer jeito. O Oban registra sucesso, não tenta de novo, e ninguém é avisado.",
    rationale:
      "Um fechamento que falhou some sem deixar rastro acionável. A contagem existe — está ali, no retorno — e não vira nem erro, nem alerta, nem reprocessamento.",
    source: "src/rules/closureGeneration.ts",
  },
  {
    id: "the-month-closes-three-hours-early",
    statement:
      "O worker usa `Date.utc_today()`. Rodando à meia-noite UTC do dia 1º, em Brasília ainda são 21h do último dia do mês que está sendo fechado.",
    rationale:
      "As últimas três horas do mês entram no fechamento seguinte. É pouco em qualquer mês e é sempre o mesmo pouco, na mesma direção — e cai justamente no fim do dia, faixa em que acompanhamento terapêutico costuma acontecer.",
    source: "src/rules/closureGeneration.ts",
  },
];

/** Quem o worker de fato processa. */
export function processedByWorker(candidate: ClosureCandidate): boolean {
  return candidate.activeNow && candidate.hasClinicalHours;
}

/**
 * Implementação de `deactivation-on-the-first-loses-the-month-worked`.
 *
 * O worker de desativação gera o fechamento do mês da **data de desativação**.
 * Quem saiu dentro do mês fechado recebe normalmente; quem saiu no dia 1º do
 * mês seguinte recebe um fechamento do mês novo — vazio — e o mês trabalhado
 * fica sem.
 */
export function workedButGetsNoClosure(data: ClosureGenerationData): ClosureCandidate[] {
  const [ano, mes] = data.month.split("-");
  const primeiroDoSeguinte = mesSeguinte(Number(ano), Number(mes));

  return data.candidates.filter(
    (candidate) =>
      candidate.hasClinicalHours &&
      !candidate.activeNow &&
      candidate.deactivatedOn === primeiroDoSeguinte,
  );
}

/** Quem saiu dentro do mês fechado: o worker de desativação cobre. */
export function coveredByDeactivationWorker(
  data: ClosureGenerationData,
): ClosureCandidate[] {
  return data.candidates.filter(
    (candidate) =>
      candidate.hasClinicalHours &&
      !candidate.activeNow &&
      (candidate.deactivatedOn ?? "").startsWith(data.month),
  );
}

function mesSeguinte(ano: number, mes: number): string {
  const proximo = mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
  return `${proximo.ano}-${String(proximo.mes).padStart(2, "0")}-01`;
}

/** As horas que ficam sem acerto — a perda com tamanho, e não como adjetivo. */
export function hoursWithoutClosure(data: ClosureGenerationData): number {
  return workedButGetsNoClosure(data).reduce(
    (total, candidate) => total + candidate.hoursInMonth,
    0,
  );
}

/** Implementação de `the-worker-reports-success-with-failures-inside`. */
export function silentFailures(data: ClosureGenerationData): ClosureCandidate[] {
  return data.candidates.filter(
    (candidate) => processedByWorker(candidate) && candidate.generationFailed === true,
  );
}

/**
 * O que o Oban registrou.
 *
 * Devolve sempre sucesso, de propósito: é a reprodução do comportamento, e é
 * comparando com {@link silentFailures} que ele se torna discutível.
 */
export function obanOutcome(data: ClosureGenerationData): {
  status: "ok";
  successes: number;
  failures: number;
} {
  const processados = data.candidates.filter(processedByWorker);
  const falhas = processados.filter((candidate) => candidate.generationFailed === true).length;
  return { status: "ok", successes: processados.length - falhas, failures: falhas };
}

/**
 * Implementação de `the-month-closes-three-hours-early`.
 *
 * Devolve a faixa local que ficou de fora, quando o worker rodou na virada em
 * UTC. `undefined` quando ele rodou em hora que não produz o deslocamento.
 */
export function hoursLostAtTheBoundary(data: ClosureGenerationData): string | undefined {
  const utc = new Date(data.ranAt);
  const diaUtc = utc.getUTCDate();
  const horaUtc = utc.getUTCHours();

  if (diaUtc !== 1 || horaUtc >= 3) return undefined;

  const local = new Date(utc.getTime() - 3 * 3_600_000);
  const ultimoDia = local.toISOString().slice(0, 10);
  return `As horas entre ${String(local.getUTCHours()).padStart(2, "0")}:00 e 24:00 de ${ultimoDia} caem no fechamento seguinte.`;
}
