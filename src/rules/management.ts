import type { Rule } from "@brucesantos/design-space";
import type { ManagementData, MentorshipGap, ReportControl } from "../contracts/index.js";

/**
 * Regras da gerência.
 *
 * A tela de gerência do Bloomy tem nove abas, e é fácil lê-la como um painel de
 * indicadores. Ela não é: cada aba é uma **fila de trabalho** com um dono e uma
 * consequência para o que fica parado. A diferença entre as duas leituras é a
 * diferença entre uma tela que alguém abre toda segunda e uma que ninguém abre.
 *
 * Traduzidas de `Reports.ReportControl`, `Professionals.Internship` e das listas
 * de `BloomyWeb.Backoffice.Management`.
 */
export const managementRules: Rule[] = [
  {
    id: "report-urgency-depends-on-requester",
    statement:
      "Um relatório atrasado pedido pela operadora tem consequência de faturamento. O mesmo relatório pedido pela família tem consequência de confiança.",
    rationale:
      "É o mesmo objeto com dois pesos. Tratar os dois com a mesma urgência faz a fila ser ordenada por data e não por consequência — e a consequência de confiança é a que não aparece em indicador nenhum.",
    source: "src/rules/management.ts",
  },
  {
    id: "applicator-without-supervisor-cannot-close",
    statement:
      "Aplicador sem vínculo de supervisão não tem quem assine as sessões que exigem segunda assinatura. O atendimento acontece e não fecha.",
    rationale:
      "A lacuna é silenciosa: aparece semanas depois, como uma pilha de atendimentos pendentes de assinatura que ninguém pode assinar. A gerência é o único lugar onde ela é visível antes disso.",
    source: "src/rules/management.ts",
  },
  {
    id: "management-fronts-have-owners",
    statement:
      "Cada frente da gerência tem um responsável nomeado. Fila sem dono é fila que ninguém trabalha.",
    rationale:
      "Nove listas numa tela só viram ruído se não estiver dito de quem é cada uma. O que decide se alguém age não é o número, é saber que o número é seu.",
    source: "src/rules/management.ts",
  },
  {
    id: "patient-without-clinical-owner-drifts",
    statement:
      "Paciente sem responsável clínico definido continua sendo atendido, e ninguém responde pelo caso dele.",
    rationale:
      "Nada trava — é justamente esse o problema. As sessões acontecem, os programas rodam, e não há quem revise a evolução ou decida mudança de fase.",
    source: "src/rules/management.ts",
  },
];

/* ============================================================ relatórios */

export function isOverdue(report: ReportControl, now: string): boolean {
  if (report.status === "completed" || report.status === "cancelled") return false;
  return report.dueDate < now.slice(0, 10);
}

export function daysLate(report: ReportControl, now: string): number {
  const due = Date.parse(`${report.dueDate}T00:00:00.000-03:00`);
  const today = Date.parse(`${now.slice(0, 10)}T00:00:00.000-03:00`);
  return Math.round((today - due) / 86_400_000);
}

/**
 * Implementação de `report-urgency-depends-on-requester`.
 *
 * O mesmo atraso, dois pesos. A frase não é um rótulo de severidade: é a
 * consequência concreta, porque é ela que faz alguém priorizar.
 */
export function overdueConsequence(report: ReportControl): string {
  return report.requester === "operator"
    ? "A operadora pediu. Atrasado, ele segura a próxima autorização e o faturamento do período."
    : "A família pediu. Atrasado, ele não trava nada no sistema — e é o tipo de coisa que faz uma família procurar outra clínica.";
}

export function requesterLabel(requester: ReportControl["requester"]): string {
  return requester === "operator" ? "Operadora" : "Família";
}

export function reportTypeLabel(type: ReportControl["reportType"]): string {
  return type === "evolution_month" ? "Evolução mensal" : "Alta hospitalar";
}

/**
 * A fila de relatórios, ordenada por consequência e não por data.
 *
 * Atrasados primeiro; dentro deles, os da operadora antes dos da família,
 * porque o atraso de um segura dinheiro que a clínica já ganhou. Depois, o que
 * ainda não venceu, pela data.
 */
export function reportQueue(data: ManagementData): ReportControl[] {
  const weight = (report: ReportControl): number => {
    if (!isOverdue(report, data.now)) return 2;
    return report.requester === "operator" ? 0 : 1;
  };

  return [...data.reports]
    .filter((report) => report.status !== "completed" && report.status !== "cancelled")
    .sort((a, b) => {
      const byWeight = weight(a) - weight(b);
      if (byWeight !== 0) return byWeight;
      return a.dueDate.localeCompare(b.dueDate);
    });
}

/* ============================================================ supervisão */

/** Implementação de `applicator-without-supervisor-cannot-close`. */
export function mentorshipConsequence(gap: MentorshipGap): string {
  return gap.kind === "applicator_without_supervisor"
    ? "Sem supervisor vinculado, as sessões que exigirem segunda assinatura não terão quem as assine. Elas acontecem e ficam pendentes."
    : "Supervisor sem nenhum aplicador vinculado. Não é um problema por si — vale conferir se alguém deveria estar sob supervisão dele.";
}

export function isBlocking(gap: MentorshipGap): boolean {
  return gap.kind === "applicator_without_supervisor";
}

/* ================================================================ frentes */

/**
 * As frentes da gerência, com dono e contagem.
 *
 * Implementação de `management-fronts-have-owners`. O dono não é decorativo: é
 * o que decide se alguém age. Uma lista de nove números sem responsável nomeado
 * é a mesma coisa que nenhuma lista.
 */
export function fronts(data: ManagementData): {
  id: string;
  title: string;
  owner: string;
  count: number;
  blocking: boolean;
}[] {
  const overdueReports = data.reports.filter((report) => isOverdue(report, data.now));
  const blockingGaps = data.mentorshipGaps.filter(isBlocking);

  return [
    {
      id: "reports",
      title: "Relatórios atrasados",
      owner: "Coordenação, com quem escreve",
      count: overdueReports.length,
      blocking: overdueReports.some((report) => report.requester === "operator"),
    },
    {
      id: "mentorship",
      title: "Aplicadores sem supervisor",
      owner: "Coordenação",
      count: blockingGaps.length,
      blocking: blockingGaps.length > 0,
    },
    {
      id: "professionals",
      title: "Cadastros de profissional incompletos",
      owner: "People",
      count: data.incompleteProfessionals.length,
      blocking: false,
    },
    {
      id: "patients",
      title: "Pacientes sem responsável clínico",
      owner: "Coordenação",
      count: data.patientsWithoutOwner.length,
      blocking: false,
    },
  ];
}

/** Quantos dias um paciente está sem responsável clínico. */
export function daysWithoutOwner(sinceDate: string, now: string): number {
  const since = Date.parse(`${sinceDate}T00:00:00.000-03:00`);
  const today = Date.parse(`${now.slice(0, 10)}T00:00:00.000-03:00`);
  return Math.round((today - since) / 86_400_000);
}

type Decision = { allowed: boolean; reason?: string };

export function canOpenManagement(permissions: string[]): Decision {
  if (!permissions.includes("management.list")) {
    return {
      allowed: false,
      reason: "A gerência é de admin, admin de clínica e coordenação.",
    };
  }
  return { allowed: true };
}
