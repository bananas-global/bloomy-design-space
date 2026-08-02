import type { Rule } from "@brucesantos/design-space";
import type { OverdueData, OverdueSchedule, ScheduleStatus } from "../contracts/index.js";

/**
 * Regras do atraso.
 *
 * `ScheduleFilters` define "pendente ou atrasado" **três vezes**, com respostas
 * diferentes:
 *
 * | Filtro | Situações incluídas | Janela |
 * | --- | --- | --- |
 * | `pending` | as quatro | nenhuma |
 * | `overdued` | as quatro | 48 horas |
 * | `overdued_for_coordinator` | três — sem a do supervisor | imediata |
 *
 * Duas pessoas olhando "atrasados" no mesmo sistema veem listas diferentes, e
 * nenhuma das duas sabe que existe outra definição.
 */
export const overdueRules: Rule[] = [
  {
    id: "overdue-means-two-different-things",
    statement:
      "Para a coordenação, um atendimento está atrasado assim que passa do horário. Para o resto do sistema, só depois de 48 horas. A mesma palavra, na mesma tela, com duas contas por trás.",
    rationale:
      "As duas escolhas são defensáveis isoladamente — quem distribui a grade precisa ver na hora; um relatório de pendência precisa de folga para não acusar o que ainda está sendo escrito. O que não é defensável é chamar as duas de “atrasado” e não dizer qual está em vigor.",
    source: "src/rules/overdue.ts",
  },
  {
    id: "the-coordinator-list-hides-the-supervisor-step",
    statement:
      "`overdued_for_coordinator` exclui `pending_supervisor_signature`. O que espera assinatura de supervisor não aparece na lista de atraso da coordenação.",
    rationale:
      "É coerente — não é a coordenação que assina — e produz um ponto cego: a etapa do supervisor é a única que some da lista de quem cobra, e a tela de Supervisão também não a mostra. Some das duas.",
    source: "src/rules/overdue.ts",
  },
];

/** As quatro situações que qualquer uma das três definições considera abertas. */
export const OPEN_STATUSES: ScheduleStatus[] = [
  "not_started",
  "pending_register",
  "pending_signature",
  "pending_supervisor_signature",
];

/** O que a coordenação não vê: a etapa que não é dela. */
const HIDDEN_FROM_COORDINATOR: ScheduleStatus = "pending_supervisor_signature";

function hoursSince(start: string, now: string): number {
  return (new Date(now).getTime() - new Date(start).getTime()) / 3_600_000;
}

/** Implementação de `overdue-means-two-different-things`, ramo da coordenação. */
export function overdueForCoordinator(entry: OverdueSchedule, now: string): boolean {
  if (!OPEN_STATUSES.includes(entry.status)) return false;
  if (entry.status === HIDDEN_FROM_COORDINATOR) return false;
  return hoursSince(entry.start, now) > 0;
}

/** O outro ramo: as quatro situações, com folga de 48 horas. */
export function overdueGenerally(entry: OverdueSchedule, now: string): boolean {
  if (!OPEN_STATUSES.includes(entry.status)) return false;
  return hoursSince(entry.start, now) > 48;
}

/** A terceira definição: aberto, sem janela nenhuma. */
export function pending(entry: OverdueSchedule): boolean {
  return OPEN_STATUSES.includes(entry.status);
}

export type OverdueVerdict = {
  paraCoordenacao: boolean;
  paraOResto: boolean;
  aberto: boolean;
};

export function verdict(entry: OverdueSchedule, now: string): OverdueVerdict {
  return {
    paraCoordenacao: overdueForCoordinator(entry, now),
    paraOResto: overdueGenerally(entry, now),
    aberto: pending(entry),
  };
}

/**
 * Os atendimentos em que as duas definições discordam.
 *
 * É a lista que importa: enquanto elas concordam, a ambiguidade não custa nada.
 */
export function whereTheDefinitionsDisagree(data: OverdueData): OverdueSchedule[] {
  return data.schedules.filter((entry) => {
    const v = verdict(entry, data.now);
    return v.aberto && v.paraCoordenacao !== v.paraOResto;
  });
}

/** O que o sistema mostraria a quem abriu, pela definição do papel dele. */
export function visibleTo(data: OverdueData): OverdueSchedule[] {
  const usaDefinicaoDaCoordenacao = data.viewerRole === "coordinator";
  return data.schedules.filter((entry) =>
    usaDefinicaoDaCoordenacao
      ? overdueForCoordinator(entry, data.now)
      : overdueGenerally(entry, data.now),
  );
}

/** Implementação de `the-coordinator-list-hides-the-supervisor-step`. */
export function hiddenFromCoordinator(data: OverdueData): OverdueSchedule[] {
  return data.schedules.filter(
    (entry) => entry.status === HIDDEN_FROM_COORDINATOR && hoursSince(entry.start, data.now) > 0,
  );
}

export function hoursOpen(entry: OverdueSchedule, now: string): number {
  return Math.max(0, Math.floor(hoursSince(entry.start, now)));
}

/* ============================================ A conta do supervisor */

/**
 * Regras de `supervisor_query`.
 *
 * É a quarta definição de atraso do arquivo, e a única com **duas janelas na
 * mesma consulta**: o supervisor vê o próprio atraso na hora e o dos outros da
 * unidade só depois de 48 horas.
 *
 * Também é sobre outro assunto: as três anteriores olham atendimentos abertos
 * (`pending_*`); esta olha agendamentos que **nem viraram atendimento**
 * (`scheduled`, `incomplete`).
 */
export const supervisorOverdueRules: Rule[] = [
  {
    id: "stricter-with-myself-than-with-others",
    statement:
      "Na consulta do supervisor, o atraso dele aparece imediatamente e o dos colegas da unidade só depois de 48 horas. Duas janelas, uma consulta.",
    rationale:
      "É a única vez no sistema em que alguém se cobra antes de cobrar os outros, e é uma escolha boa demais para se perder numa reescrita. Sem estar nomeada, ela vira “inconsistência” na primeira leitura de quem simplifica.",
    source: "src/rules/overdue.ts",
  },
  {
    id: "the-supervisor-list-is-about-a-different-thing",
    statement:
      "As outras três definições olham atendimentos abertos. Esta olha agendamentos que nem começaram — `scheduled` e `incomplete` — e ainda por cima só os que não têm atendimento associado.",
    rationale:
      "Chamar as duas listas de “atrasados” faz parecer que uma é subconjunto da outra. Não é: uma pergunta “o que não foi fechado”, a outra “o que não foi nem começado”. São dois problemas com donos diferentes.",
    source: "src/rules/overdue.ts",
  },
];

/** As situações que `supervisor_query` procura: agendamento que não virou atendimento. */
export const NEVER_STARTED_STATUSES: ScheduleStatus[] = ["scheduled", "incomplete"];

export type SupervisorScope = { supervisorProfessionalName: string };

/** Implementação de `stricter-with-myself-than-with-others`. */
export function inSupervisorQuery(
  entry: OverdueSchedule,
  now: string,
  scope: SupervisorScope,
): boolean {
  if (!NEVER_STARTED_STATUSES.includes(entry.status)) return false;

  const meu = entry.professionalName === scope.supervisorProfessionalName;
  const horas = (new Date(now).getTime() - new Date(entry.start).getTime()) / 3_600_000;

  return meu ? horas > 0 : horas > 48;
}

/** O que a consulta traz por ser do próprio supervisor, e não por tempo. */
export function onlyBecauseItIsMine(
  data: OverdueData,
  scope: SupervisorScope,
): OverdueSchedule[] {
  return data.schedules.filter((entry) => {
    if (!inSupervisorQuery(entry, data.now, scope)) return false;
    if (entry.professionalName !== scope.supervisorProfessionalName) return false;
    const horas = (new Date(data.now).getTime() - new Date(entry.start).getTime()) / 3_600_000;
    return horas <= 48;
  });
}

/**
 * Implementação de `the-supervisor-list-is-about-a-different-thing`.
 *
 * Devolve o que está aberto (pendente de fechamento) e **não** entraria nesta
 * consulta — a prova de que as duas listas não se contêm.
 */
export function openButNotInSupervisorQuery(data: OverdueData): OverdueSchedule[] {
  return data.schedules.filter(
    (entry) => OPEN_STATUSES.includes(entry.status) && !NEVER_STARTED_STATUSES.includes(entry.status),
  );
}
