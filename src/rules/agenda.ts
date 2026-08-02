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

import type {
  AbsenceOrigin,
  AbsenceOriginData,
  AbsenceRecord,
  AppointmentStatus,
  Impediment,
  ImpedimentKind,
  ScheduleAttempt,
  ScheduleStatus,
} from "../contracts/index.js";

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

/* ================================================ Ausência e cancelamento */

/**
 * Regras da contagem de ausência.
 *
 * `ScheduleFilters` tem três maneiras sobrepostas de perguntar a mesma coisa —
 * `missed`, `cancelled` e `absence` — e a terceira mistura as duas primeiras.
 *
 * A duplicidade entre os filtros `status` e `schedule_status` **não** virou
 * regra aqui: ela não tem manifestação em tela nenhuma, e uma regra que nenhum
 * cenário consegue exercitar é texto, não especificação. Ficou registrada como
 * achado sobre o monólito, que é o lugar dela.
 */
export const absenceRules: Rule[] = [
  {
    id: "the-absence-filter-counts-cancellations",
    statement:
      "O filtro `absence` seleciona `status in [:missed, :cancelled]`. Uma família que avisou com antecedência entra na mesma conta de quem não apareceu.",
    rationale:
      "São comportamentos opostos: cancelar é comunicar, faltar é não comunicar. Somados, o número não mede adesão — mede horário perdido, que é outra pergunta e tem outro dono. E é com esse número que alguém conversa com a família.",
    source: "src/rules/agenda.ts",
  },
  {
    id: "three-filters-ask-the-same-question",
    statement:
      "`missed` olha a coluna `missed_at`, `cancelled` olha `cancelled_at`, e `absence` olha o campo `status`. Três caminhos para o mesmo fato, por vias diferentes.",
    rationale:
      "Enquanto os três concordam, ninguém percebe. Divergem no dia em que a situação muda depois do carimbo — e aí duas telas do mesmo sistema mostram números diferentes sem que nenhuma esteja errada.",
    source: "src/rules/agenda.ts",
  },
];

/**
 * O que o filtro `absence` do sistema real devolve.
 *
 * Aceita os dois vocabulários porque eles convivem: `Schedule` usa `missed` e a
 * agenda usa `no_show` para o mesmo fato. Essa duplicidade de nome é parte do
 * problema que esta regra descreve.
 */
export function countedAsAbsenceToday(status: ScheduleStatus | AppointmentStatus): boolean {
  return status === "missed" || status === "no_show" || status === "cancelled";
}

/** O que ausência quer dizer: não apareceu, e ninguém avisou. */
export function isAbsence(status: ScheduleStatus | AppointmentStatus): boolean {
  return status === "missed" || status === "no_show";
}

export type AttendanceBreakdown = {
  /** Não apareceu. */
  missed: number;
  /** Avisou antes. */
  cancelled: number;
  /** O total que o filtro do sistema devolveria — a soma dos dois. */
  countedTogether: number;
};

/**
 * Implementação de `the-absence-filter-counts-cancellations`.
 *
 * Devolve os dois números **e** a soma, de propósito: é a comparação entre eles
 * que mostra o tamanho do problema. Só a soma esconderia; só as parcelas não
 * diriam o que o sistema hoje responde.
 */
export function attendanceBreakdown(
  statuses: (ScheduleStatus | AppointmentStatus)[],
): AttendanceBreakdown {
  const missed = statuses.filter(isAbsence).length;
  const cancelled = statuses.filter((status) => status === "cancelled").length;
  return { missed, cancelled, countedTogether: missed + cancelled };
}

/** Quanto da "ausência" relatada é, na verdade, aviso prévio. */
export function shareThatWasWarned(breakdown: AttendanceBreakdown): number | undefined {
  if (breakdown.countedTogether === 0) return undefined;
  return Math.round((breakdown.cancelled / breakdown.countedTogether) * 100);
}

/* ============================================== De onde vem uma ausência */

/**
 * Regras da origem da ausência.
 *
 * Fecham o arco aberto por `the-absence-filter-counts-cancellations`. O número
 * de "ausências" contém três coisas diferentes, e só uma delas é ausência.
 */
export const absenceOriginRules: Rule[] = [
  {
    id: "some-absences-were-never-observed",
    statement:
      "`MarkDelayedSchedulesAsMissedWorker` converte em ausência todo agendamento parado há sete dias em atraso, com motivo `:delay` e descrição “atraso”. Ninguém viu a família não aparecer.",
    rationale:
      "É uma limpeza de fila apresentada como fato clínico. A criança pode ter vindo e o registro simplesmente não ter sido fechado — e a partir da conversão não há como distinguir uma coisa da outra sem abrir o histórico.",
    source: "src/rules/agenda.ts",
  },
  {
    id: "the-absence-number-holds-four-different-things",
    statement:
      "Somando o filtro `absence` aos dois workers, o número de ausências contém quatro origens: quem faltou, quem cancelou avisando, quem ficou sete dias parado em atraso, e quem continuava simplesmente marcado na manhã seguinte.",
    rationale:
      "Quatro origens, uma conta, e duas delas fabricadas por rotina. É o número que embasa a conversa com quem trouxe a criança — e, na maior parte, ele não mede a família.",
    source: "src/rules/agenda.ts",
  },
  {
    id: "one-worker-blames-the-patient-by-name",
    statement:
      "`MissedAttendedWorker` converte na manhã seguinte todo agendamento que continuava marcado, com `missing_reason: :missing_patient`. O outro worker usa `:delay`.",
    rationale:
      "A diferença entre os dois motivos é a diferença entre “ninguém fechou isto” e “o paciente faltou”. O segundo é uma afirmação sobre uma pessoa, feita por uma rotina que não olhou nada — e basta a recepção não ter feito o check-in.",
    source: "src/rules/agenda.ts",
  },
  {
    id: "an-open-session-is-undone-overnight",
    statement:
      "`NotAttendedWorker` devolve para “não iniciado” todo atendimento que ficou em andamento ou pronto no dia anterior. A sessão que alguém começou e não fechou é desfeita na virada.",
    rationale:
      "Desfazer sem registrar apaga a evidência de que houve início. Quem abriu a sessão e foi interrompido volta no dia seguinte e encontra o agendamento como se nada tivesse acontecido — e o `update_all` não deixa log.",
    source: "src/rules/agenda.ts",
  },
];

export function absenceOriginLabel(origin: AbsenceOrigin): string {
  switch (origin) {
    case "observed":
      return "Alguém registrou a falta";
    case "cancelled":
      return "A família avisou antes";
    case "fabricated_by_delay":
      return "Convertida após sete dias parada";
    case "fabricated_blaming_patient":
      return "Convertida na manhã seguinte, culpando o paciente";
  }
}

/** O que essa origem de fato mede — que é o que decide se ela pertence à conta. */
export function whatTheOriginMeasures(origin: AbsenceOrigin): string {
  switch (origin) {
    case "observed":
      return "comportamento da família";
    case "cancelled":
      return "comunicação da família — o oposto de faltar";
    case "fabricated_by_delay":
      return "desorganização interna: um registro que ninguém fechou em sete dias";
    case "fabricated_blaming_patient":
      return "que o check-in não foi feito — e o motivo gravado acusa o paciente";
  }
}

/** Implementação de `some-absences-were-never-observed`. */
export function wasObserved(record: AbsenceRecord): boolean {
  return record.origin === "observed";
}

/** Implementação de `the-absence-number-holds-four-different-things`. */
export function absencesByOrigin(
  data: AbsenceOriginData,
): { origin: AbsenceOrigin; count: number }[] {
  // Ordem: da mais parecida com ausência para a menos.
  const ordem: AbsenceOrigin[] = [
    "observed",
    "cancelled",
    "fabricated_by_delay",
    "fabricated_blaming_patient",
  ];
  return ordem
    .map((origin) => ({
      origin,
      count: data.records.filter((record) => record.origin === origin).length,
    }))
    .filter((linha) => linha.count > 0);
}

/** As origens que uma rotina fabricou, sem ninguém olhar. */
export function fabricated(data: AbsenceOriginData): AbsenceRecord[] {
  return data.records.filter(
    (record) =>
      record.origin === "fabricated_by_delay" ||
      record.origin === "fabricated_blaming_patient",
  );
}

/**
 * Implementação de `one-worker-blames-the-patient-by-name`.
 *
 * Separada das demais fabricadas de propósito: as duas são automáticas, e só
 * uma grava uma afirmação sobre a pessoa.
 */
export function blamesThePatient(record: AbsenceRecord): boolean {
  return record.origin === "fabricated_blaming_patient";
}

/** Quanto do número relatado mede comportamento da família, e não outra coisa. */
export function shareThatIsReallyAbsence(data: AbsenceOriginData): number | undefined {
  if (data.records.length === 0) return undefined;
  return Math.round((data.records.filter(wasObserved).length / data.records.length) * 100);
}
