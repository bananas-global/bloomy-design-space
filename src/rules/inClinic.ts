import type { Rule } from "@brucesantos/design-space";
import type {
  DaySchedule,
  InClinicData,
  PatientPresence,
  ScheduleStatus,
} from "../contracts/index.js";

/**
 * Regras do quadro da unidade.
 *
 * O check-in não é um carimbo: ele reescreve a situação de todos os
 * agendamentos do paciente naquele dia, e o check-out desfaz parte disso. Está
 * em `ServiceRecords.Context`, em três `update_all` que ninguém lê ao desenhar
 * a tela — e é o que decide se o atendimento pode começar.
 */
export const inClinicRules: Rule[] = [
  {
    id: "one-active-checkin-per-patient",
    statement:
      "Um paciente não pode ter dois check-ins ativos. Enquanto não houver check-out, um novo check-in é recusado.",
    rationale:
      "Check-in é prova de presença para o convênio. Dois abertos ao mesmo tempo produzem duas provas para uma presença só.",
    source: "src/rules/inClinic.ts",
  },
  {
    id: "checkin-marks-later-schedules-ready",
    statement:
      "O check-in coloca em Pronto todos os agendamentos do paciente naquele dia cujo horário ainda não passou, vindos de Agendado ou de Atrasado.",
    rationale:
      "É o que libera o início do atendimento. Um paciente presente com agendamento ainda em Agendado é um atendimento que a profissional não consegue começar, sem entender por quê.",
    source: "src/rules/inClinic.ts",
  },
  {
    id: "checkin-marks-earlier-schedules-delayed",
    statement:
      "O mesmo check-in marca como Atrasado os agendamentos daquele dia cujo horário já passou e que ainda estavam em Agendado.",
    rationale:
      "Distingue quem faltou de quem chegou tarde. Sem isso, o horário perdido fica igual a um horário nunca honrado, e o indicador de falta deixa de servir para conversar com a família.",
    source: "src/rules/inClinic.ts",
  },
  {
    id: "checkout-returns-schedules-to-scheduled",
    statement:
      "O check-out devolve a Agendado todos os agendamentos do dia que estavam em Pronto — inclusive os que ainda não começaram.",
    rationale:
      "O paciente foi embora: nenhum horário do dia continua pronto para começar. Manter Pronto depois da saída deixa a profissional iniciar um atendimento de alguém que não está mais na unidade.",
    source: "src/rules/inClinic.ts",
  },
  {
    id: "in-clinic-tabs-follow-role",
    statement:
      "O quadro tem duas abas. A de pacientes não aparece para `people`; a de profissionais não aparece para especialista, supervisor e terapeuta.",
    rationale:
      "Quem atende não precisa da presença dos colegas para trabalhar, e People não alcança paciente em nenhuma tela. Um quadro com aba vazia ensina a clicar em algo que nunca serve.",
    source: "src/rules/inClinic.ts",
  },
];

/* ============================================================== presença */

/** Está na unidade agora: fez check-in e ainda não fez check-out. */
export function isPresent(presence: { checkoutAt?: string }): boolean {
  return presence.checkoutAt === undefined;
}

export function presentPatients(data: InClinicData): PatientPresence[] {
  return data.patients.filter(isPresent);
}

export function presentProfessionals(data: InClinicData) {
  return data.professionals.filter(isPresent);
}

type Decision = { allowed: boolean; reason?: string };

/** Implementação de `one-active-checkin-per-patient`. */
export function canCheckin(
  data: InClinicData,
  patientId: string,
  permissions: string[],
): Decision {
  if (!permissions.includes("service_records.checkin")) {
    return { allowed: false, reason: "Seu perfil não registra check-in." };
  }

  const active = data.patients.find(
    (presence) => presence.patient.id === patientId && isPresent(presence),
  );
  if (active) {
    return {
      allowed: false,
      reason: `${active.patient.name} já possui um check-in ativo, feito às ${active.checkinAt.slice(11, 16)}.`,
    };
  }

  return { allowed: true };
}

/* ====================================================== efeito no dia */

/**
 * Implementação de `checkin-marks-later-schedules-ready` e
 * `checkin-marks-earlier-schedules-delayed`, espelhando
 * `ServiceRecords.Context.mark_schedules_delayed/1` e `mark_schedules_ready/1`.
 *
 * A ordem das três passadas é a do monólito, e ela produz um resultado que vale
 * ser visto antes de virar suporte:
 *
 * 1. Passado + Agendado → Atrasado
 * 2. Futuro + (Agendado ou Atrasado) → Pronto
 * 3. Passado + Pronto → Agendado
 *
 * A terceira existe para o segundo check-in do dia: o horário que já estava
 * pronto e passou volta a Agendado. Note que ela **não** o marca como Atrasado,
 * então a mesma situação de fato — paciente presente, horário vencido — para em
 * dois estados diferentes conforme o que veio antes. Está reproduzido como é, e
 * registrado como divergência no log do porte.
 */
export function schedulesAfterCheckin(
  schedules: DaySchedule[],
  checkinAt: string,
): DaySchedule[] {
  const moment = Date.parse(checkinAt);
  const sameDay = (schedule: DaySchedule) =>
    schedule.start.slice(0, 10) === checkinAt.slice(0, 10);

  return schedules.map((schedule) => {
    if (!sameDay(schedule)) return schedule;

    const started = Date.parse(schedule.start) < moment;
    let status: ScheduleStatus = schedule.status;

    if (started && status === "scheduled") status = "delayed";
    if (!started && (status === "scheduled" || status === "delayed")) {
      status = "ready_for_service";
    }
    if (started && status === "ready_for_service") status = "scheduled";

    return status === schedule.status ? schedule : { ...schedule, status };
  });
}

/**
 * Implementação de `checkout-returns-schedules-to-scheduled`, espelhando
 * `back_schedules_to_scheduled_on_delete/1`.
 *
 * Não olha o horário: qualquer agendamento do dia em Pronto volta a Agendado.
 * O paciente foi embora, e nenhum horário do dia continua pronto para começar.
 */
export function schedulesAfterCheckout(
  schedules: DaySchedule[],
  checkinAt: string,
): DaySchedule[] {
  return schedules.map((schedule) =>
    schedule.start.slice(0, 10) === checkinAt.slice(0, 10) &&
    schedule.status === "ready_for_service"
      ? { ...schedule, status: "scheduled" }
      : schedule,
  );
}

/* ================================================================= abas */

/**
 * Implementação de `in-clinic-tabs-follow-role`.
 *
 * O monólito decide isso por papel direto, e não por permissão nomeada — é o
 * único lugar do porte em que reproduzir fielmente significa perguntar pelo
 * papel. Está isolado aqui para não contaminar o resto: nenhuma tela deve
 * copiar este padrão.
 */
export function visibleTabs(role: string): { patients: boolean; professionals: boolean } {
  return {
    patients: role !== "people",
    professionals: !["specialist", "supervisor", "therapeutic_companion"].includes(role),
  };
}

/* ============================================================== leitura */

/** Há quanto tempo a pessoa está na unidade, em minutos. */
export function minutesInClinic(
  presence: { checkinAt: string; checkoutAt?: string },
  now: string,
): number {
  const end = Date.parse(presence.checkoutAt ?? now);
  return Math.max(0, Math.round((end - Date.parse(presence.checkinAt)) / 60_000));
}

/**
 * O que o quadro precisa destacar sobre um paciente presente.
 *
 * Atrasado e sem nada pronto é a combinação que exige alguém agir: o paciente
 * está na unidade e não há atendimento que possa começar.
 */
export function presenceAlert(presence: PatientPresence): string | undefined {
  if (!isPresent(presence)) return undefined;

  const ready = presence.schedules.filter((item) => item.status === "ready_for_service");
  if (ready.length > 0) return undefined;

  const delayed = presence.schedules.filter((item) => item.status === "delayed");
  if (delayed.length > 0) {
    return `Chegou depois do horário: ${delayed.length === 1 ? "o atendimento das" : "os atendimentos das"} ${delayed.map((item) => item.start.slice(11, 16)).join(", ")} ${delayed.length === 1 ? "está atrasado" : "estão atrasados"}.`;
  }

  const ongoing = presence.schedules.some((item) => item.status === "ongoing");
  if (ongoing) return undefined;

  return "Está na unidade e não há atendimento pronto para começar.";
}
