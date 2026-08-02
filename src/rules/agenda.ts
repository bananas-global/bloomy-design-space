import type { Rule } from "@brucesantos/design-space";
import type { Appointment } from "../contracts/index.js";

/**
 * Regras da agenda.
 *
 * Implementação junto da declaração de propósito: uma regra sem implementação
 * testável é uma frase que a engenharia vai reinterpretar, e o custo dessa
 * reinterpretação é exatamente o que o Design Space existe para reduzir.
 */
export const agendaRules: Rule[] = [
  {
    id: "cancel-requires-reason",
    statement: "Cancelamento exige justificativa registrada.",
    rationale:
      "Sem motivo, a clínica não distingue desistência de falha de atendimento, e o indicador de cancelamento não serve para decidir nada.",
    source: "src/rules/agenda.ts",
  },
  {
    id: "cancel-requires-permission",
    statement:
      "Só perfis com `schedules.cancel` podem cancelar um atendimento: recepção, coordenador e admin.",
    rationale:
      "Cancelamento tem efeito financeiro e sobre a fila de espera. No Bloomy real, `SchedulePolicy` dá cancelamento a quem opera a agenda — inclusive a recepção — e nega a quem atende. O terapeuta que precisa desmarcar passa pela recepção ou pela coordenação, e a tela precisa dizer isso em vez de sumir com o botão.",
    source: "src/rules/agenda.ts",
  },
  {
    id: "no-double-booking",
    statement:
      "O mesmo profissional não pode ter dois atendimentos sobrepostos. Um reagendamento que criaria sobreposição precisa resolver o conflito antes de confirmar.",
    rationale:
      "O sistema atual aceita a sobreposição e o conflito só aparece na recepção, com os dois pacientes presentes.",
    source: "src/rules/agenda.ts",
  },
  {
    id: "no-show-after-tolerance",
    statement:
      "Ausência só pode ser registrada 15 minutos depois do horário marcado, e exige `schedules.edit`.",
    rationale:
      "Marcar ausência cedo demais gera cobrança indevida e discussão no balcão. A tolerância é do processo da clínica.",
    source: "src/rules/agenda.ts",
  },
];

export const NO_SHOW_TOLERANCE_MINUTES = 15;

type Decision = { allowed: boolean; reason?: string };

/** Implementação de `cancel-requires-permission` e `cancel-requires-reason`. */
export function canCancel(appointment: Appointment, permissions: string[]): Decision {
  if (!permissions.includes("schedules.cancel")) {
    return { allowed: false, reason: "Seu perfil não cancela atendimentos. Peça à recepção ou à coordenação." };
  }
  if (appointment.status === "cancelled") {
    return { allowed: false, reason: "Este atendimento já está cancelado." };
  }
  if (appointment.status === "finished") {
    return { allowed: false, reason: "Atendimento já finalizado não pode ser cancelado." };
  }
  return { allowed: true };
}

/**
 * Implementação de `no-show-after-tolerance`.
 *
 * `now` é parâmetro e não `Date.now()`: é o que permite ao cenário fixar o
 * instante e ao teste verificar a fronteira dos 15 minutos sem esperar.
 */
export function canMarkNoShow(
  appointment: Appointment,
  permissions: string[],
  now: string,
): Decision {
  if (!permissions.includes("schedules.edit")) {
    return { allowed: false, reason: "Seu perfil não registra ausência." };
  }
  if (appointment.status !== "scheduled" && appointment.status !== "confirmed") {
    return { allowed: false, reason: "Só atendimento agendado ou confirmado pode virar ausência." };
  }

  const elapsedMinutes = (Date.parse(now) - Date.parse(appointment.start)) / 60_000;
  if (elapsedMinutes < NO_SHOW_TOLERANCE_MINUTES) {
    const remaining = Math.ceil(NO_SHOW_TOLERANCE_MINUTES - elapsedMinutes);
    return {
      allowed: false,
      reason: `A tolerância é de ${NO_SHOW_TOLERANCE_MINUTES} minutos. Faltam ${remaining} para poder registrar ausência.`,
    };
  }
  return { allowed: true };
}

/** Implementação de `no-double-booking`: detecta sobreposição real de intervalo. */
export function findConflicts(appointments: Appointment[]): Map<string, string[]> {
  const conflicts = new Map<string, string[]>();
  const active = appointments.filter(
    (item) => item.status !== "cancelled" && item.status !== "no_show",
  );

  for (const a of active) {
    for (const b of active) {
      if (a.id === b.id) continue;
      if (a.professional.id !== b.professional.id) continue;
      const overlaps = Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
      if (!overlaps) continue;
      conflicts.set(a.id, [...(conflicts.get(a.id) ?? []), b.id]);
    }
  }

  return conflicts;
}

/** `true` quando confirmar este horário criaria sobreposição. */
export function wouldConflict(
  appointment: Appointment,
  target: { start: string; end: string },
  others: Appointment[],
): boolean {
  const candidate: Appointment = { ...appointment, start: target.start, end: target.end };
  return (findConflicts([candidate, ...others.filter((o) => o.id !== appointment.id)]).get(
    appointment.id,
  )?.length ?? 0) > 0;
}

/* ================================================ Marcar um atendimento */

import type { Impediment, ImpedimentKind, ScheduleAttempt } from "../contracts/index.js";

/**
 * Regras da tentativa de marcar.
 *
 * `ScheduleVerification.verify/2` roda sete verificadores em ordem fixa e usa
 * `Enum.find_value` — que **para no primeiro que devolve algo**. Quem tenta
 * marcar recebe um impedimento por vez, na ordem em que o código os lista, e
 * não na ordem que importa para resolver.
 *
 * Traduzido de `Bloomy.Schedules.ScheduleVerification` e dos sete módulos
 * `Verify*` que ela compõe.
 */
export const schedulingRules: Rule[] = [
  {
    id: "impediments-are-revealed-one-at-a-time",
    statement:
      "As sete verificações rodam em sequência e param na primeira que falha. Um horário com quatro problemas exige quatro tentativas de salvar para que todos apareçam.",
    rationale:
      "Cada tentativa custa uma conversa: a recepção está com a família na frente ou no telefone. Descobrir que o profissional está bloqueado, corrigir, e só então descobrir que a sala está lotada é o padrão mais caro possível para quem atende sob interrupção.",
    source: "src/rules/agenda.ts",
  },
  {
    id: "impediment-order-is-code-order",
    statement:
      "A ordem é: profissional desativado, bloqueio do profissional, bloqueio da unidade, bloqueio da sala, bloqueio geral, atendimento duplicado e, por último, lotação da sala.",
    rationale:
      "Não é uma ordem de gravidade nem de facilidade de resolver — é a ordem em que os módulos aparecem numa lista. A lotação da sala, que costuma ser a mais fácil de contornar trocando de sala, é a última a ser dita.",
    source: "src/rules/agenda.ts",
  },
  {
    id: "room-capacity-is-not-one",
    statement:
      "A sala é verificada por `capacity <= schedule_count`. Salas comportam mais de um atendimento simultâneo, e “ocupada” só quer dizer cheia.",
    rationale:
      "Quem lê a agenda assume que uma sala com atendimento está indisponível. Mostrar ocupação contra capacidade evita que se recuse um horário que caberia.",
    source: "src/rules/agenda.ts",
  },
  {
    id: "room-is-not-verified-outside-the-clinic",
    statement:
      "Acompanhamento terapêutico (`schedule_type: :at`) não passa pela verificação de sala — ele não acontece na clínica.",
    rationale:
      "É a decisão certa, e ela precisa aparecer: sem dizer isso, um horário de AT sem sala parece um cadastro incompleto e alguém vai “corrigi-lo”.",
    source: "src/rules/agenda.ts",
  },
];

/** A ordem exata do array de verificadores em `ScheduleVerification`. */
export const IMPEDIMENT_ORDER: ImpedimentKind[] = [
  "professional_inactive",
  "professional_blocked",
  "unit_blocked",
  "room_blocked",
  "general_blocking",
  "duplicate_slot",
  "room_full",
];

export function impedimentLabel(kind: ImpedimentKind): string {
  switch (kind) {
    case "professional_inactive":
      return "Profissional desativado";
    case "professional_blocked":
      return "Bloqueio na agenda do profissional";
    case "unit_blocked":
      return "Bloqueio na agenda da unidade";
    case "room_blocked":
      return "Bloqueio na agenda da sala";
    case "general_blocking":
      return "Bloqueio geral no período";
    case "duplicate_slot":
      return "Já existe atendimento igual no horário";
    case "room_full":
      return "Sala lotada";
  }
}

/** Quem resolve cada um. Sem isso, a lista informa e não encaminha. */
export function impedimentOwner(kind: ImpedimentKind): string {
  switch (kind) {
    case "professional_inactive":
      return "People, que reativa o cadastro";
    case "professional_blocked":
    case "duplicate_slot":
      return "Coordenação, escolhendo outro horário ou outro profissional";
    case "unit_blocked":
    case "general_blocking":
      return "Administração da unidade, que criou o bloqueio";
    case "room_blocked":
    case "room_full":
      return "Recepção, trocando de sala";
  }
}

/**
 * Implementação de `impediments-are-revealed-one-at-a-time`.
 *
 * Reproduz o `Enum.find_value`: devolve **um** impedimento, o primeiro na ordem
 * do código. Existe para ser comparado com {@link allImpediments} — é a
 * comparação que mostra o custo.
 */
export function firstImpediment(attempt: ScheduleAttempt): Impediment | undefined {
  for (const kind of IMPEDIMENT_ORDER) {
    const found = attempt.impediments.find((entry) => entry.kind === kind);
    if (found) return found;
  }
  return undefined;
}

/** Todos, na mesma ordem — o que esta especificação propõe mostrar de uma vez. */
export function allImpediments(attempt: ScheduleAttempt): Impediment[] {
  return IMPEDIMENT_ORDER.flatMap((kind) =>
    attempt.impediments.filter((entry) => entry.kind === kind),
  );
}

/** Quantas vezes alguém salvaria para ver tudo, do jeito que o sistema real responde. */
export function savesToSeeEverything(attempt: ScheduleAttempt): number {
  return allImpediments(attempt).length;
}

export function canSchedule(attempt: ScheduleAttempt): { allowed: boolean; reason?: string } {
  const first = firstImpediment(attempt);
  if (!first) return { allowed: true };
  return { allowed: false, reason: first.message };
}

/**
 * Implementação de `room-is-not-verified-outside-the-clinic`.
 *
 * Diz por que a sala não foi checada, em vez de simplesmente não checar — um
 * horário de AT sem sala parece cadastro incompleto para quem não sabe disso.
 */
export function roomVerificationSkipped(attempt: ScheduleAttempt): string | undefined {
  if (attempt.scheduleType === "at") {
    return "Acompanhamento terapêutico não acontece na clínica: a verificação de sala não roda, e a ausência de sala aqui não é cadastro incompleto.";
  }
  if (attempt.roomName === undefined) {
    return "Sem sala escolhida, não há o que verificar. A sala ainda pode ser definida depois.";
  }
  return undefined;
}

/** Implementação de `room-capacity-is-not-one`. */
export function roomHeadroom(attempt: ScheduleAttempt): number | undefined {
  if (attempt.roomCapacity === undefined || attempt.roomOccupancy === undefined) return undefined;
  return attempt.roomCapacity - attempt.roomOccupancy;
}
