import type { Rule } from "@brucesantos/design-space";
import type { BatchAttempt, BatchOutcome, TissBatchData } from "../contracts/index.js";

/**
 * Regras do envio do lote TISS.
 *
 * O lote é a fatura da clínica para a operadora. `Tiss.Workers.TissBatch` o
 * gera e envia — e três decisões desse worker fazem uma fatura sumir sem que
 * ninguém saiba:
 *
 * ```elixir
 * use Oban.Worker, max_attempts: 1
 * ...
 * {:error, _reason} -> {:error, "Erro ao gerar o xml"}
 * rescue
 *   _exception -> {:discard, "Erro ao gerar o xml"}
 * ```
 */
export const tissBatchRules: Rule[] = [
  {
    id: "the-batch-is-never-retried",
    statement:
      "`max_attempts: 1`. Uma falha de rede na hora de enviar significa que o lote não vai ser enviado — nem agora, nem depois.",
    rationale:
      "O lote é a fatura do mês. Uma indisponibilidade momentânea da operadora, que se resolveria sozinha em minutos, vira faturamento perdido — e a perda não tem sintoma até alguém conferir o repasse.",
    source: "src/rules/tissBatch.ts",
  },
  {
    id: "an-exception-discards-the-batch",
    statement:
      "Qualquer exceção cai num `rescue` que devolve `:discard`. O Oban marca o job como descartado e segue adiante.",
    rationale:
      "`:discard` é o veredito mais definitivo do Oban: nem erro para investigar, nem retentativa. Um lote que estourou por um dado inesperado desaparece com a mesma discrição de um que deu certo.",
    source: "src/rules/tissBatch.ts",
  },
  {
    id: "refusal-and-crash-log-the-same-string",
    statement:
      "A recusa da operadora e a exceção no código gravam “Erro ao gerar o xml”. E o motivo que a operadora deu é descartado — `{:error, _reason}`.",
    rationale:
      "São dois problemas com donos opostos: um é da operadora e se resolve conversando, o outro é do código e se resolve corrigindo. Pelo registro, ninguém distingue — e a resposta da operadora, que diria qual é qual, foi jogada fora.",
    source: "src/rules/tissBatch.ts",
  },
];

export function outcomeLabel(outcome: BatchOutcome): string {
  switch (outcome) {
    case "sent":
      return "Enviado";
    case "refused":
      return "Recusado pela operadora";
    case "crashed":
      return "Exceção ao gerar o XML";
    case "pending":
      return "Aguardando envio";
  }
}

/** De quem é resolver — a informação que o registro atual não permite deduzir. */
export function outcomeOwner(outcome: BatchOutcome): string | undefined {
  switch (outcome) {
    case "refused":
      return "Operação, conversando com a operadora";
    case "crashed":
      return "Engenharia: o lote não chegou a ser gerado";
    default:
      return undefined;
  }
}

/** Implementação de `refusal-and-crash-log-the-same-string`. */
export function indistinguishableInTheLog(attempt: BatchAttempt): boolean {
  return attempt.outcome === "refused" || attempt.outcome === "crashed";
}

/** As tentativas que ninguém vai reprocessar, porque o worker não tenta de novo. */
export function lostWithoutRetry(data: TissBatchData): BatchAttempt[] {
  return data.attempts.filter(indistinguishableInTheLog);
}

/** Quanto deixou de ser faturado — a perda com tamanho, e não como adjetivo. */
export function amountNotBilledCents(data: TissBatchData): number {
  return lostWithoutRetry(data).reduce((total, attempt) => total + attempt.amountCents, 0);
}

/**
 * O que o registro do job diz — igual para os dois fracassos.
 *
 * Reproduzir a string é o ponto: é comparando com {@link outcomeLabel} que a
 * perda de informação fica visível.
 */
export function loggedString(attempt: BatchAttempt): string | undefined {
  return indistinguishableInTheLog(attempt) ? "Erro ao gerar o xml" : undefined;
}

/** A resposta da operadora que o código descarta, quando existiu. */
export function discardedByTheCode(attempt: BatchAttempt): string | undefined {
  return attempt.outcome === "refused" ? attempt.insurerMessage : undefined;
}
