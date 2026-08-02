import type { Rule } from "@brucesantos/design-space";
import type { DeactivationAttempt, DeactivationDateData } from "../contracts/index.js";

/**
 * Regras da data de desativação.
 *
 * Uma linha só, e dois defeitos independentes dentro dela:
 *
 * ```elixir
 * if current_user_role != "admin" and Date.compare(value, Date.utc_today()) == :lt,
 *   do: add_error(changeset, :deactivation_date, "Não pode ser uma data passada")
 * ```
 *
 * **O papel chega como átomo.** `field :roles, EctoBitwiseEnum, values: [:admin, ...]`,
 * e `current_role` vem de `List.last(user.roles)`. `:admin != "admin"` é
 * verdadeiro, então a exceção nunca vale para ninguém.
 *
 * E os três caminhos que produziriam a string `"admin"` esbarram na mesma
 * confusão:
 *
 * ```elixir
 * role = if "admin" in user.roles, do: "admin", else: List.last(user.roles)
 * ```
 *
 * `"admin" in [:admin, :coordinator]` é falso. O único lugar que geraria o
 * texto é ele próprio inalcançável.
 *
 * **A data de hoje é medida em UTC.** A clínica está em `America/São_Paulo`,
 * UTC−3 o ano inteiro. Entre 21h e a meia-noite, `Date.utc_today()` já devolve
 * amanhã — e a data de hoje passa a ser recusada por ser passada.
 */
export const deactivationDateRules: Rule[] = [
  {
    id: "the-admin-exemption-is-unreachable",
    statement:
      "A validação abre exceção para quem é `admin`, comparando o papel com um texto. O papel chega como átomo, então a comparação nunca dá certo: ninguém recebe a exceção, nem os administradores.",
    rationale:
      "Uma permissão que não é negada, é ignorada — não há mensagem, não há registro, e nada distingue o administrador do resto. Quem escreveu a linha decidiu que admin pode retroagir a data; a decisão está no código e nunca chegou a valer. O pior efeito é de segundo grau: como a exceção parece existir, ninguém procura por que ela não funciona.",
    source: "src/rules/deactivationDate.ts",
  },
  {
    id: "the-only-place-that-makes-the-text-is-itself-unreachable",
    statement:
      "No login, o sistema tenta guardar o papel como o texto `\"admin\"` — e a condição que decide isso compara o mesmo texto com uma lista de átomos. A única linha capaz de produzir o valor que a validação espera nunca roda.",
    rationale:
      "Vale registrar separado porque muda o diagnóstico. Não é um lugar com o tipo errado que dá para consertar isolado: são dois, e o segundo é justamente o que faria o primeiro funcionar. Corrigir só a validação não resolve, e corrigir só o login também não.",
    source: "src/rules/deactivationDate.ts",
  },
  {
    id: "today-is-measured-in-utc",
    statement:
      "A data de hoje é medida em UTC, e a clínica está três horas atrás. Das 21h à meia-noite, hoje já é ontem para a validação, e desativar um paciente com a data de hoje é recusado por ser data passada.",
    rationale:
      "São três horas de todo dia em que a tela mente sobre o calendário, e é justamente o fim do expediente — a hora de fechar pendências. A mensagem “Não pode ser uma data passada” é a pior possível para o caso, porque é literalmente falsa: a pessoa olha o calendário, vê que é hoje, e não tem como concluir nada além de que o sistema quebrou.",
    source: "src/rules/deactivationDate.ts",
  },
  {
    id: "the-two-defects-cover-each-other",
    statement:
      "Na janela das 21h à meia-noite, ninguém consegue desativar com a data de hoje — e a saída prevista para esse caso, o administrador, é exatamente a que não funciona.",
    rationale:
      "Separados, cada um teria contorno: com a exceção viva, um admin destravaria a noite; com o fuso certo, o papel morto não apareceria. Juntos não sobra caminho, e é por isso que os dois merecem ser mostrados na mesma tela, e não em duas.",
    source: "src/rules/deactivationDate.ts",
  },
];

/** Fuso da clínica: UTC−3 o ano inteiro, sem horário de verão desde 2019. */
const OFFSET_HORAS = 3;

/** A data local no instante do envio. */
export function localDate(attempt: DeactivationAttempt): string {
  return attempt.submittedAt.slice(0, 10);
}

/**
 * Implementação de `today-is-measured-in-utc`.
 *
 * `Date.utc_today()` no instante do envio.
 */
export function utcDate(attempt: DeactivationAttempt): string {
  const local = new Date(`${attempt.submittedAt.slice(0, 19)}Z`);
  local.setUTCHours(local.getUTCHours() + OFFSET_HORAS);
  return local.toISOString().slice(0, 10);
}

/** O envio cai numa hora em que UTC já virou o dia. */
export function crossesIntoTomorrow(attempt: DeactivationAttempt): boolean {
  return utcDate(attempt) !== localDate(attempt);
}

/**
 * Implementação de `the-admin-exemption-is-unreachable`.
 *
 * A comparação é com o texto `"admin"`; o valor chega como átomo.
 */
export function exemptionApplies(attempt: DeactivationAttempt): boolean {
  return attempt.roleArrivesAsText && attempt.actorRole === "admin";
}

/** Quem deveria ter a exceção e não tem. */
export function shouldBeExempt(data: DeactivationDateData): DeactivationAttempt[] {
  return data.attempts.filter(
    (attempt) => attempt.actorRole === "admin" && !exemptionApplies(attempt),
  );
}

/** O veredito que o sistema dá hoje. */
export function isRejected(attempt: DeactivationAttempt): boolean {
  return !exemptionApplies(attempt) && attempt.chosenDate < utcDate(attempt);
}

/** O veredito que o sistema daria se medisse o dia no fuso da clínica. */
export function wouldBeRejectedLocally(attempt: DeactivationAttempt): boolean {
  return !exemptionApplies(attempt) && attempt.chosenDate < localDate(attempt);
}

/**
 * Implementação de `the-two-defects-cover-each-other`.
 *
 * Recusado só porque UTC já virou o dia. É o conjunto que some no dia em que o
 * fuso for corrigido.
 */
export function rejectedOnlyByTheClock(data: DeactivationDateData): DeactivationAttempt[] {
  return data.attempts.filter(
    (attempt) => isRejected(attempt) && !wouldBeRejectedLocally(attempt),
  );
}

/** Recusas legítimas: a data escolhida é passada em qualquer fuso. */
export function rejectedOnTheMerits(data: DeactivationDateData): DeactivationAttempt[] {
  return data.attempts.filter((attempt) => isRejected(attempt) && wouldBeRejectedLocally(attempt));
}

/** Quem passa. */
export function accepted(data: DeactivationDateData): DeactivationAttempt[] {
  return data.attempts.filter((attempt) => !isRejected(attempt));
}

/** A hora local do envio, para nomear a janela. */
export function localHour(attempt: DeactivationAttempt): number {
  return Number(attempt.submittedAt.slice(11, 13));
}

/** Como dizer o motivo da recusa sem repetir a frase falsa do sistema. */
export function rejectionExplanation(attempt: DeactivationAttempt): string | undefined {
  if (!isRejected(attempt)) return undefined;
  if (wouldBeRejectedLocally(attempt)) {
    return "A data escolhida já passou.";
  }
  return `A data escolhida é hoje. O sistema conta o dia em outro fuso, três horas à frente, e depois das ${24 - OFFSET_HORAS}h já está contando amanhã.`;
}
