import type { Rule } from "@brucesantos/design-space";
import type { FunnelStep, Prospect, ProspectsData } from "../contracts/index.js";

/**
 * Regras do funil de visitas.
 *
 * É o único lugar do produto em que alguém ainda **não é paciente** — e por
 * isso o único em que quase nada é obrigatório. A consequência aparece no fim:
 * converter exige um conjunto de dados que a visita nunca coletou.
 *
 * Traduzidas de `Prospects.Funnel`, `Prospects.ConvertToPatientParams` e
 * `Prospects.ProspectStepHistory`.
 */
export const prospectRules: Rule[] = [
  {
    id: "lost-is-a-side-exit-not-the-last-step",
    statement:
      "Perdido não é o fim da fila: é uma saída que acontece de qualquer passo. O funil tem uma linha e duas saídas.",
    rationale:
      "Desenhado como último estágio, o funil sugere que todo mundo caminha até o fim antes de desistir — e esconde exatamente onde as pessoas param, que é a única coisa que a leitura do funil serve para descobrir.",
    source: "src/rules/prospects.ts",
  },
  {
    id: "conversion-needs-more-than-the-visit-collected",
    statement:
      "Converter em paciente exige data de nascimento e sexo da criança, e data de nascimento, estado civil e relação do responsável — nenhum deles coletado durante a visita.",
    rationale:
      "O último passo do funil é sempre uma coleta de dados, e ninguém avisa isso antes. Quem chega ali com a família na frente descobre que precisa de meia dúzia de informações novas.",
    source: "src/rules/prospects.ts",
  },
  {
    id: "availability-is-what-makes-the-first-schedule-possible",
    statement:
      "As janelas de disponibilidade declaradas pela família são o que permite marcar a primeira sessão. Sem elas, o prospect avança no funil e trava no agendamento.",
    rationale:
      "É a informação mais barata de coletar na visita e a mais cara de perseguir depois, por telefone, com a criança já avaliada.",
    source: "src/rules/prospects.ts",
  },
  {
    id: "step-history-explains-the-funnel",
    statement:
      "Cada mudança de passo fica registrada com quem fez e quando. É o histórico que explica por que um prospect está parado.",
    rationale:
      "Um prospect em “aguardando plano” há dois meses e um que chegou lá ontem aparecem iguais numa lista por passo. Só o histórico distingue os dois.",
    source: "src/rules/prospects.ts",
  },
];

/* ================================================================= funil */

/** A linha principal do funil, sem a saída lateral. */
export const FUNNEL_LINE: FunnelStep[] = [
  "new",
  "initial_contact",
  "in_avaliation",
  "submitted",
  "waiting_plan",
  "scheduled",
  "converted",
];

const LABEL: Record<FunnelStep, string> = {
  new: "Novo",
  initial_contact: "Contato inicial",
  in_avaliation: "Em avaliação",
  submitted: "Proposta enviada",
  waiting_plan: "Aguardando plano",
  scheduled: "Primeira sessão marcada",
  converted: "Convertido em paciente",
  lost: "Perdido",
};

export function stepLabel(step: FunnelStep): string {
  return LABEL[step];
}

/** Implementação de `lost-is-a-side-exit-not-the-last-step`. */
export function isSideExit(step: FunnelStep): boolean {
  return step === "lost";
}

export function stepPosition(step: FunnelStep): number | undefined {
  const index = FUNNEL_LINE.indexOf(step);
  return index === -1 ? undefined : index;
}

/**
 * De onde as pessoas saem do funil.
 *
 * É a leitura que justifica desenhar `lost` como saída lateral: agrupar as
 * perdas pelo passo em que aconteceram diz onde o processo perde gente, e é
 * exatamente o que um funil de oito estágios em linha esconde.
 */
export function lossesByStep(data: ProspectsData): { step: FunnelStep; count: number }[] {
  const counts = new Map<FunnelStep, number>();

  for (const prospect of data.prospects) {
    if (prospect.step !== "lost") continue;
    const change = [...prospect.history].reverse().find((item) => item.to === "lost");
    const from = change?.from ?? "new";
    counts.set(from, (counts.get(from) ?? 0) + 1);
  }

  return FUNNEL_LINE.filter((step) => counts.has(step)).map((step) => ({
    step,
    count: counts.get(step)!,
  }));
}

/* ============================================================= conversão */

/**
 * O que a conversão exige e a visita não coletou.
 *
 * Implementação de `conversion-needs-more-than-the-visit-collected`. Os campos
 * vêm de `ConvertToPatientParams`; o que o prospect guarda vem de
 * `Prospects.LegalGuardian`, que tem quatro campos. A diferença é a lista
 * abaixo — e ela é sempre a mesma, porque a visita nunca coleta isso.
 */
export const CONVERSION_EXTRA_FIELDS = [
  "data de nascimento da criança",
  "sexo da criança",
  "data de nascimento do responsável",
  "estado civil do responsável",
  "relação do responsável com a criança",
] as const;

type Decision = { allowed: boolean; reason?: string };

export function canConvert(prospect: Prospect, permissions: string[]): Decision {
  if (!permissions.includes("patients.create")) {
    return { allowed: false, reason: "Seu perfil não cria pacientes." };
  }

  if (prospect.step === "converted") {
    return { allowed: false, reason: `${prospect.childName} já foi convertido em paciente.` };
  }

  if (prospect.step === "lost") {
    return {
      allowed: false,
      reason: "Este contato foi marcado como perdido. Reabra o funil antes de converter.",
    };
  }

  const missing = missingForConversion(prospect);
  if (missing.length > 0) {
    return {
      allowed: false,
      reason: `Faltam ${missing.length} ${missing.length === 1 ? "informação" : "informações"} que a visita não coleta: ${missing.join(", ")}.`,
    };
  }

  return { allowed: true };
}

/**
 * O que falta para converter.
 *
 * Sempre inclui os cinco campos que a visita não coleta — é o ponto da regra —,
 * mais o CPF do responsável quando ele não foi anotado.
 */
export function missingForConversion(prospect: Prospect): string[] {
  const missing = [...CONVERSION_EXTRA_FIELDS];
  const extra: string[] = [];
  if (!prospect.guardianCpf?.trim()) extra.push("CPF do responsável");
  return [...extra, ...missing];
}

/* ========================================================= agendabilidade */

/** Implementação de `availability-is-what-makes-the-first-schedule-possible`. */
export function canScheduleFirstSession(prospect: Prospect): Decision {
  if (prospect.availability.length === 0) {
    return {
      allowed: false,
      reason:
        "A família não declarou nenhuma janela de disponibilidade. É a informação mais barata de coletar na visita e a mais cara de perseguir depois.",
    };
  }
  return { allowed: true };
}

/* ============================================================= histórico */

/** Há quantos dias o prospect está parado no passo atual. */
export function daysInCurrentStep(prospect: Prospect, now: string): number | undefined {
  const last = [...prospect.history].reverse().find((item) => item.to === prospect.step);
  if (!last) return undefined;

  const since = Date.parse(last.at.slice(0, 10) + "T00:00:00.000-03:00");
  const today = Date.parse(now.slice(0, 10) + "T00:00:00.000-03:00");
  return Math.round((today - since) / 86_400_000);
}

/**
 * Implementação de `step-history-explains-the-funnel`.
 *
 * Um prospect parado há dois meses e um que chegou ontem aparecem iguais numa
 * lista por passo. Esta função é o que permite distingui-los.
 */
export function stalled(data: ProspectsData, thresholdDays = 30): Prospect[] {
  return data.prospects
    .filter((prospect) => prospect.step !== "converted" && prospect.step !== "lost")
    .filter((prospect) => (daysInCurrentStep(prospect, data.now) ?? 0) >= thresholdDays);
}

export function sourceLabel(source: Prospect["source"]): string {
  return { indication: "Indicação", search: "Busca", others: "Outros" }[source];
}

export function weekdayName(weekday: number): string {
  return ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"][weekday - 1] ?? "—";
}
