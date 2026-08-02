import type { Rule } from "@brucesantos/design-space";
import type {
  ClinicHour,
  ClinicalHourRecord,
  ExpectedClinicHour,
} from "../contracts/index.js";

/**
 * Regras do controle de horas.
 *
 * É a tela em que um erro vira dinheiro. Cada registro tem horas previstas,
 * horas trabalhadas e um valor diário esperado, e o que separa as três é
 * aritmética que ninguém confere.
 *
 * Traduzido de `Bloomy.Professionals.ClinicalHours` — `Checkin`, `Checkout`,
 * `RecalculateExpectedHours`, `ClinicHour` e `VerificationLog`.
 */
export const clinicalHourRules: Rule[] = [
  {
    id: "expected-hours-truncate-downwards",
    statement:
      "As horas previstas são somadas em segundos e divididas por 3600 com `div`, que trunca. Um dia previsto de 7h30 é gravado como 7 — e a coluna é inteira, então nem caberia 7,5.",
    rationale:
      "O arredondamento vai sempre para o mesmo lado, e é o lado que favorece a clínica. Meia hora por dia são onze horas num mês de vinte e dois dias úteis. Ninguém confere porque cada linha isolada erra pouco.",
    source: "src/rules/clinicalHours.ts",
  },
  {
    id: "verification-is-optional-and-silent",
    statement:
      "O registro de geolocalização só é gravado quando latitude e longitude chegam preenchidas, e o resultado da gravação é descartado. Sem coordenadas — GPS desligado, permissão negada, falha na inserção — o check-in dá certo e nada é dito.",
    rationale:
      "Uma verificação que silenciosamente não acontece é pior que nenhuma: o registro fica com a mesma aparência de um verificado. Quem for auditar meses depois não tem como distinguir “estava lá” de “não sabemos”.",
    source: "src/rules/clinicalHours.ts",
  },
  {
    id: "who-registered-is-part-of-the-record",
    statement:
      "`checkin_done_by` e `checkout_done_by` distinguem a marca feita pelo profissional no app da feita por alguém no escritório. É a única coisa no registro que faz essa distinção.",
    rationale:
      "Hora registrada e hora atribuída pesam diferente numa conferência, e a diferença já está gravada. Não mostrá-la desperdiça o único dado de proveniência que existe — e deixa invisível o caso que mais interessa: dia aberto pelo app e fechado pelo escritório.",
    source: "src/rules/clinicalHours.ts",
  },
  {
    id: "expected-hour-without-end-breaks-the-sum",
    statement:
      "`ExpectedClinicHour` exige só `start_at`, e `RecalculateExpectedHours` faz `Time.diff(end_at, start_at)` sem checar. O cadastro permite exatamente a forma que o cálculo não processa.",
    rationale:
      "Não é uma divergência de opinião entre duas camadas: é o changeset autorizando o dado que a função a jusante trata como impossível. O erro aparece na hora de recalcular, longe de quem salvou.",
    source: "src/rules/clinicalHours.ts",
  },
  {
    id: "checkout-before-checkin-is-accepted",
    statement:
      "Nada compara `end_at` com `start_at`. Uma saída anterior à entrada é aceita, e `Time.diff` devolve um número negativo que entra na soma.",
    rationale:
      "Um erro de digitação de quem preenche pelo escritório não é rejeitado nem sinalizado: ele subtrai horas do total. O registro fica menor do que deveria, e o profissional é quem descobre — se descobrir.",
    source: "src/rules/clinicalHours.ts",
  },
];

type Decision = { allowed: boolean; reason?: string };

/* ================================================================ tempo */

function minutesOf(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** Duração em minutos. Negativa quando a faixa está invertida — de propósito. */
export function spanMinutes(range: { startAt: string; endAt?: string }): number | undefined {
  if (!range.endAt) return undefined;
  return minutesOf(range.endAt) - minutesOf(range.startAt);
}

/* =========================================================== previstas */

/** As faixas previstas que o cálculo do sistema real não consegue processar. */
export function expectedWithoutEnd(expected: ExpectedClinicHour[]): ExpectedClinicHour[] {
  return expected.filter((entry) => entry.endAt === undefined);
}

/**
 * A soma honesta das horas previstas, em minutos.
 *
 * As faixas sem fim são ignoradas em vez de derrubarem a conta — mas
 * {@link expectedWithoutEnd} continua existindo para que elas sejam ditas, e
 * não silenciosamente descartadas.
 */
export function expectedMinutes(expected: ExpectedClinicHour[]): number {
  return expected.reduce((total, entry) => total + (spanMinutes(entry) ?? 0), 0);
}

/**
 * Implementação de `expected-hours-truncate-downwards`.
 *
 * Reproduz `Enum.sum_by(...) |> div(3600)`. Reproduzir importa: é comparando
 * este número com {@link expectedMinutes} que a perda fica visível.
 */
export function storedExpectedHours(expected: ExpectedClinicHour[]): number {
  return Math.trunc(expectedMinutes(expected) / 60);
}

/** Os minutos que somem no truncamento — sempre para o mesmo lado. */
export function minutesLostToTruncation(expected: ExpectedClinicHour[]): number {
  return expectedMinutes(expected) - storedExpectedHours(expected) * 60;
}

/** O que a perda vira num mês de vinte e dois dias úteis, se o dia se repetir. */
export function monthlyLossHours(expected: ExpectedClinicHour[], workingDays = 22): number {
  return Math.round((minutesLostToTruncation(expected) * workingDays) / 60);
}

/* ========================================================= trabalhadas */

/** Faixas em que a saída é anterior à entrada. Implementação de `checkout-before-checkin-is-accepted`. */
export function reversedHours(hours: ClinicHour[]): ClinicHour[] {
  return hours.filter((hour) => {
    const span = spanMinutes(hour);
    return span !== undefined && span < 0;
  });
}

/** Faixas ainda em aberto — jornada começada e não fechada. */
export function openHours(hours: ClinicHour[]): ClinicHour[] {
  return hours.filter((hour) => hour.endAt === undefined);
}

export function workedMinutes(hours: ClinicHour[]): number {
  return hours.reduce((total, hour) => total + (spanMinutes(hour) ?? 0), 0);
}

/* ======================================================== verificação */

export type VerificationState = "verified" | "half" | "none";

/**
 * Implementação de `verification-is-optional-and-silent`.
 *
 * Três estados, e o do meio é o que o sistema real esconde: entrada verificada
 * e saída não, ou o contrário. Colapsar em "sim/não" perderia justamente o caso
 * em que alguém marcou de dentro da clínica e saiu de casa.
 */
export function verificationState(record: ClinicalHourRecord): VerificationState {
  const hasCheckin = record.verifications.some((entry) => entry.type === "checkin");
  const hasCheckout = record.verifications.some((entry) => entry.type === "checkout");

  if (hasCheckin && hasCheckout) return "verified";
  if (hasCheckin || hasCheckout) return "half";
  return "none";
}

export function verificationLabel(state: VerificationState): string {
  switch (state) {
    case "verified":
      return "Entrada e saída com localização registrada";
    case "half":
      return "Só uma das duas marcas tem localização";
    case "none":
      return "Nenhuma marca tem localização registrada";
  }
}

/* ======================================================== proveniência */

export type Attribution = "self" | "office" | "mixed";

/** Implementação de `who-registered-is-part-of-the-record`. */
export function attributionOf(hour: ClinicHour): Attribution {
  if (hour.checkoutDoneBy === undefined) {
    return hour.checkinDoneBy === "app" ? "self" : "office";
  }
  if (hour.checkinDoneBy === hour.checkoutDoneBy) {
    return hour.checkinDoneBy === "app" ? "self" : "office";
  }
  return "mixed";
}

export function attributionLabel(attribution: Attribution): string {
  switch (attribution) {
    case "self":
      return "Marcado pelo profissional, no app";
    case "office":
      return "Preenchido no escritório";
    case "mixed":
      return "Aberto pelo profissional e fechado no escritório";
  }
}

/** As faixas que alguém escreveu por outra pessoa. */
export function writtenByTheOffice(hours: ClinicHour[]): ClinicHour[] {
  return hours.filter((hour) => attributionOf(hour) !== "self");
}

/* =============================================================== acesso */

export function canEditHours(permissions: string[]): Decision {
  if (permissions.includes("clinical_hours.edit")) return { allowed: true };
  return {
    allowed: false,
    reason:
      "Editar controle de horas é de admin, admin de clínica, coordenação e People — e do aplicativo, quando é o próprio profissional marcando.",
  };
}

/* ================================================================ leitura */

export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? "−" : "";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  if (rest === 0) return `${sign}${hours}h`;
  // Abaixo de uma hora, "0h30" se lê mal num aviso — e é justamente em avisos
  // que os valores pequenos aparecem.
  if (hours === 0) return `${sign}${rest}min`;
  return `${sign}${hours}h${String(rest).padStart(2, "0")}`;
}
