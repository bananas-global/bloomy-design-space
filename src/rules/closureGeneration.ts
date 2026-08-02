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
    id: "deactivated-professional-gets-no-closure",
    statement:
      "A busca filtra `p.status == true` — ativo **na hora em que o worker roda**, e não durante o mês fechado. Quem trabalhou o mês inteiro e foi desativado antes da virada não recebe fechamento.",
    rationale:
      "O trabalho aconteceu e as horas estão registradas; o que mudou foi o cadastro, depois. É dinheiro que deixa de ser acertado por causa de uma data em outro formulário — e ninguém percebe, porque a ausência de um fechamento não gera nada.",
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
 * Implementação de `deactivated-professional-gets-no-closure`.
 *
 * Trabalhou no mês e não vai receber fechamento porque o cadastro mudou depois.
 */
export function workedButGetsNoClosure(data: ClosureGenerationData): ClosureCandidate[] {
  return data.candidates.filter(
    (candidate) => candidate.hasClinicalHours && !candidate.activeNow,
  );
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
