import type { Rule } from "@brucesantos/design-space";
import type { SupervisedSchedule, SupervisionData, SupervisorRow } from "../contracts/index.js";
import { TODAY } from "../contracts/index.js";

/**
 * Regras da supervisão.
 *
 * A tela se chama "Supervisão" e a leitura óbvia é que ela serve ao supervisor.
 * Não serve: `ProfessionalPolicy.can?(role, :list_supervisor)` lista
 * `admin`, `clinic_admin` e `coordinator` — e o papel `supervisor` não está
 * lá. Quem supervisiona nunca abre esta tela.
 *
 * Uma vez visto isso, o resto do desenho fica coerente: é uma tela **sobre**
 * supervisores, para quem coordena. O período padrão olha 30 dias para trás,
 * porque auditoria olha para trás. E a tabela lista agendamento, não estado de
 * supervisão.
 *
 * Traduzido de `BloomyWeb.Backoffice.Supervisor.Index` e
 * `Bloomy.Professionals.ProfessionalPolicy`.
 */
export const supervisionRules: Rule[] = [
  {
    id: "supervision-screen-is-not-for-the-supervisor",
    statement:
      "`list_supervisor` é de admin, admin de clínica e coordenação. O papel `supervisor` não alcança a tela de Supervisão.",
    rationale:
      "Não é necessariamente errado — é uma visão de coordenação, e o supervisor acompanha os casos dele por outro caminho. Mas o nome promete o contrário, e quem lê a lista de papéis assume que supervisor supervisiona por ali. A tela precisa dizer para quem ela é, e para onde vai quem ela não atende.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "supervision-defaults-to-the-past",
    statement:
      "O período abre em [hoje − 30 dias, hoje]. A tela nasce mostrando o que já aconteceu, e nada do que vem.",
    rationale:
      "Auditoria e acompanhamento pedem janelas opostas. Conferir o que passou é legítimo; ser o único padrão significa que ninguém abre a tela para decidir onde estar amanhã — e é justamente aí que a supervisão muda o resultado.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "supervision-table-omits-supervision",
    statement:
      "A tabela mostra serviço, profissional, paciente, sala, horário e situação do agendamento. Não mostra se a assinatura do supervisor está pendente — que é a razão de o vínculo existir.",
    rationale:
      "A segunda assinatura é o único efeito mecânico do vínculo de supervisão em todo o sistema. Deixá-la de fora da tela de supervisão significa que a pendência só aparece atendimento a atendimento, e quem coordena descobre pelo atraso.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "supervisor-is-derived-from-links",
    statement:
      "A lista filtra por `has_supervisor_internships`. Quem tem o papel de supervisor e nenhum vínculo não aparece — e quem tem vínculo aparece, tendo o papel ou não.",
    rationale:
      "Derivar do vínculo é mais honesto que derivar do papel: supervisão é uma relação, não um cargo. O efeito colateral é que um supervisor recém-designado fica invisível exatamente no momento em que alguém precisaria lhe atribuir alguém.",
    source: "src/rules/supervision.ts",
  },
  {
    id: "today-is-measured-in-utc",
    statement:
      "O período padrão é calculado com `Date.utc_today()`. Entre 21h e a meia-noite em Brasília, “hoje” já é o dia seguinte em UTC, e a janela inteira anda um dia.",
    rationale:
      "Ninguém percebe, porque o intervalo tem 30 dias e um dia a mais no fim não chama atenção. Percebe-se no dia em que alguém confere um número da tela contra um relatório e eles não batem.",
    source: "src/rules/supervision.ts",
  },
];

type Decision = { allowed: boolean; reason?: string };

/* ============================================================== acesso */

/** Implementação de `supervision-screen-is-not-for-the-supervisor`. */
export function canOpenSupervision(permissions: string[], role: string): Decision {
  if (permissions.includes("professionals.list_supervisor")) return { allowed: true };

  if (role === "supervisor") {
    return {
      allowed: false,
      reason:
        "A tela de Supervisão é da coordenação: ela lista supervisores e o que os supervisionados atenderam. Os seus casos você acompanha pelo atendimento, onde a sua assinatura é pedida.",
    };
  }

  return {
    allowed: false,
    reason: "Só admin, admin de clínica e coordenação abrem a tela de Supervisão.",
  };
}

/* ============================================================== período */

/**
 * Implementação de `supervision-defaults-to-the-past`.
 *
 * Reproduz `Date.shift(today, day: -30)`. A referência é {@link TODAY} e não o
 * relógio — o cenário do período padrão precisa dar o mesmo intervalo em
 * qualquer dia em que alguém o abrir.
 */
export function defaultPeriod(today = TODAY): { start: string; end: string } {
  const end = new Date(`${today}T12:00:00.000Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  return { start: start.toISOString().slice(0, 10), end: today };
}

/** O período padrão não alcança nada do que vem — é a constatação, medida. */
export function looksForward(period: { start: string; end: string }, today = TODAY): boolean {
  return period.end > today;
}

/* ========================================================= supervisores */

/** Implementação de `supervisor-is-derived-from-links`. */
export function listedSupervisors(all: SupervisorRow[]): SupervisorRow[] {
  return all.filter((supervisor) => supervisor.internCount > 0);
}

/**
 * Quem some da tela por não ter vínculo nenhum.
 *
 * Existe para ser dito, e não para ser corrigido em silêncio: é exatamente
 * quem alguém precisaria encontrar para lhe atribuir o primeiro supervisionado.
 */
export function hiddenForHavingNoLinks(all: SupervisorRow[]): SupervisorRow[] {
  return all.filter((supervisor) => supervisor.internCount === 0);
}

/* ====================================================== estado do caso */

export type SupervisionState =
  | "awaiting-supervisor"
  | "awaiting-professional"
  | "signed"
  | "not-supervised"
  | "not-yet"
  | "will-not-happen";

/**
 * Implementação de `supervision-table-omits-supervision`.
 *
 * É a coluna que falta na tela real, e ela é derivada da situação do
 * agendamento — que já distingue `pending_signature` de
 * `pending_supervisor_signature`. Deduzir só das datas de assinatura daria o
 * mesmo resultado na maior parte dos casos e divergiria justamente nos que
 * importam.
 *
 * A ordem das perguntas importa: um atendimento que ainda não aconteceu não
 * está pendente de assinatura, e tratá-lo como pendente encheria a tela de
 * atrasos falsos.
 */
export function supervisionState(schedule: SupervisedSchedule): SupervisionState {
  if (schedule.status === "cancelled" || schedule.status === "missed") return "will-not-happen";
  if (!schedule.needsSupervisorSignature) return "not-supervised";

  switch (schedule.status) {
    case "pending_supervisor_signature":
      return "awaiting-supervisor";
    case "pending_signature":
    case "pending_register":
      return "awaiting-professional";
    case "finished":
      return "signed";
    default:
      return "not-yet";
  }
}

export function supervisionStateLabel(state: SupervisionState): string {
  switch (state) {
    case "awaiting-supervisor":
      return "Aguardando a assinatura do supervisor";
    case "awaiting-professional":
      return "Aguardando quem atendeu assinar";
    case "signed":
      return "Assinado pelos dois";
    case "not-supervised":
      return "Não exige segunda assinatura";
    case "not-yet":
      return "Ainda não atendido";
    case "will-not-happen":
      return "Cancelado ou sem comparecimento — não haverá assinatura";
  }
}

/** Os atendimentos parados esperando o supervisor — o número que a tela deve abrir. */
export function awaitingSupervisor(data: SupervisionData): SupervisedSchedule[] {
  return data.schedules.filter(
    (schedule) => supervisionState(schedule) === "awaiting-supervisor",
  );
}

/** Os que esperam quem atendeu: a cobrança tem outro destinatário. */
export function awaitingProfessional(data: SupervisionData): SupervisedSchedule[] {
  return data.schedules.filter(
    (schedule) => supervisionState(schedule) === "awaiting-professional",
  );
}

/**
 * Quantos dias um atendimento está parado esperando assinatura.
 *
 * Medido contra a data do atendimento, e não contra a da primeira assinatura:
 * o que interessa a quem coordena é há quanto tempo o atendimento aconteceu
 * sem fechar.
 */
export function daysWaiting(schedule: SupervisedSchedule, today = TODAY): number {
  const day = schedule.start.slice(0, 10);
  const from = new Date(`${day}T12:00:00.000Z`).getTime();
  const to = new Date(`${today}T12:00:00.000Z`).getTime();
  return Math.max(0, Math.round((to - from) / 86_400_000));
}
