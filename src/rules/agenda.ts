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
