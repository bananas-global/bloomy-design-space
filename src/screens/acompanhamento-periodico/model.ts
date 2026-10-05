/**
 * Acompanhamento periódico — o checklist mensal e o cálculo da classificação.
 *
 * Hoje o `PeriodicMonitoring` do monólito tem seis perguntas em `select`, com a
 * escala `immediate_attention` / `close_monitoring` / `adequate` / `very_good`.
 * O design novo mantém a escala (1 a 4, nessa ordem) e troca as perguntas por
 * dez, quatro delas críticas, com pontuação e classificação.
 */
import type { TagVariant } from "../../components/Tag.js";

export type Score = 1 | 2 | 3 | 4;

export type Question = { id: string; critical: boolean; text: string; hint: string };

export const QUESTIONS: Question[] = [
  { id: "patient_progress", critical: true, text: "O cliente apresentou evolução nas habilidades e objetivos trabalhados neste mês?", hint: "Considere os dados, observações clínicas e progresso em relação ao PEI." },
  { id: "interfering_behaviors", critical: true, text: "Os comportamentos interferentes estão sob controle e permitindo o avanço da intervenção?", hint: "Considere frequência, intensidade e impacto na aprendizagem." },
  { id: "safety_risks", critical: true, text: "Existem riscos relacionados à segurança do cliente, familiares, colegas ou equipe?", hint: "Considere agressões, autoagressões, fugas e outros comportamentos de risco." },
  { id: "program_fit", critical: false, text: "Os programas e objetivos atuais estão adequados às necessidades do cliente?", hint: "Considere se há necessidade de revisão, inclusão ou retirada de metas." },
  { id: "data_recording", critical: false, text: "Os registros e dados do caso estão sendo coletados de forma consistente e confiável?", hint: "Considere qualidade e frequência dos registros." },
  { id: "team_repertoire", critical: false, text: "A equipe possui repertório técnico suficiente para conduzir o caso com qualidade?", hint: "Considere domínio dos programas, manejo comportamental e tomada de decisão." },
  { id: "team_adherence", critical: false, text: "A equipe está aderindo às orientações e feedbacks fornecidos pela supervisão?", hint: "Considere implementação das estratégias combinadas e consistência da intervenção." },
  { id: "family_collaboration", critical: false, text: "A família está colaborando com o tratamento e mantendo uma comunicação adequada com a equipe?", hint: "Considere participação, alinhamento e adesão às orientações importantes." },
  { id: "attendance", critical: false, text: "A frequência e participação do cliente nas sessões estão adequadas para os objetivos terapêuticos?", hint: "Considere faltas, atrasos e cancelamentos." },
  { id: "continuity_risks", critical: true, text: "Existe algum fator que possa comprometer a continuidade ou o sucesso do atendimento?", hint: "Considere insatisfação da família, dificuldades da equipe, necessidade de recursos adicionais ou outros riscos para o caso." },
];

/** A escala do enum do monólito; a nota é o peso. */
export const OPTIONS: { score: Score; label: string; tag: TagVariant }[] = [
  { score: 1, label: "Atenção imediata", tag: "red" },
  { score: 2, label: "Precisa de acompanhamento próximo", tag: "orange" },
  { score: 3, label: "Adequado", tag: "light-blue" },
  { score: 4, label: "Muito bom / sem preocupações", tag: "green" },
];

export const optionOf = (score: number | undefined) => OPTIONS.find((o) => o.score === score);

export type Level = "stable" | "attention" | "priority";

export const LEVELS: Record<Level, { label: string; tag: TagVariant; message: string }> = {
  stable: { label: "Estável", tag: "green", message: "O caso está evoluindo bem, sem pontos críticos. Mantenha o plano terapêutico atual." },
  attention: { label: "Atenção", tag: "yellow", message: "O caso apresenta pontos que merecem acompanhamento próximo nas próximas semanas." },
  priority: { label: "Prioritário", tag: "red", message: "O caso exige atenção imediata e revisão do plano terapêutico." },
};

export const MAX_POINTS = QUESTIONS.length * 4;

export type Answers = Partial<Record<string, Score>>;

export type Result = {
  total: number;
  answered: number;
  complete: boolean;
  level: Level | null;
  /** A primeira pergunta crítica com nota 1 ou 2, com o número dela (1 a 10). */
  critical: { question: Question; number: number } | null;
};

/**
 * 31 a 40 é Estável, 21 a 30 Atenção e 10 a 20 Prioritário. Nota 1 ou 2 numa
 * pergunta crítica leva a Prioritário, qualquer que seja o total.
 */
export function scoreOf(answers: Answers): Result {
  const values = QUESTIONS.map((q) => answers[q.id]);
  const answered = values.filter(Boolean).length;
  const total = values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
  const complete = answered === QUESTIONS.length;
  const index = complete ? QUESTIONS.findIndex((q) => q.critical && (answers[q.id] ?? 0) <= 2) : -1;
  const critical = index >= 0 ? { question: QUESTIONS[index]!, number: index + 1 } : null;
  let level: Level | null = null;
  if (complete) level = critical || total <= 20 ? "priority" : total <= 30 ? "attention" : "stable";
  return { total, answered, complete, level, critical };
}

export type Professional = { name: string; avatarUrl?: string; role: string };

export type Monitoring = {
  id: string;
  /** `dd/mm/aaaa`, do log de criação. */
  date: string;
  author: Professional;
  answers: Answers;
  /** O último log de edição. */
  edited?: { by: string; at: string };
};

/** `translated_professional_role/1` da lista. */
export const ROLE_LABELS: Record<string, string> = {
  coordinator: "COORDENADOR",
  supervisor: "SUPERVISOR",
  applicator: "APLICADOR",
  specialist: "ESPECIALISTA",
  therapeutic_companion: "TERAPEUTA",
};
