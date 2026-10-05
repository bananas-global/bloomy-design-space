/**
 * Avaliação de desempenho — os itens, a escala e o cálculo da classificação.
 *
 * Novo, ainda não existe no Phoenix. Espelha o acompanhamento periódico do
 * paciente, mas avalia o profissional em dois eixos (técnico e
 * comportamental), por ciclo trimestral, e registra a devolutiva.
 */
import type { TagVariant } from "../../components/Tag.js";

export type Score = 1 | 2 | 3 | 4;

export type Dimension = { id: "technical" | "behavioral"; label: string; icon: string; description: string };

export const DIMENSIONS: Dimension[] = [
  { id: "technical", label: "Competências técnicas", icon: "fa-memo-circle-check", description: "Domínio clínico, aplicação dos protocolos e registro" },
  { id: "behavioral", label: "Conduta e comportamento", icon: "fa-people-group", description: "Postura profissional, relação com família e equipe" },
];

export type Question = { id: string; dimension: Dimension["id"]; critical: boolean; text: string; hint: string };

/** 12 itens, seis por eixo. Nota 1 ou 2 num item crítico leva a Plano de ação. */
export const QUESTIONS: Question[] = [
  { id: "aba_procedures", dimension: "technical", critical: true, text: "Domina os procedimentos ABA dos programas que aplica.", hint: "Considere execução de tentativas, prompting, esvanecimento e critérios de mudança." },
  { id: "data_collection", dimension: "technical", critical: false, text: "Coleta e registra os dados da sessão com precisão e em tempo real.", hint: "Considere fidelidade do registro, atrasos de lançamento e consistência entre sessões." },
  { id: "behavior_management", dimension: "technical", critical: true, text: "Maneja comportamentos interferentes conforme o protocolo do caso.", hint: "Considere segurança, uso das estratégias combinadas e ausência de intervenções improvisadas." },
  { id: "individualization", dimension: "technical", critical: false, text: "Individualiza a condução conforme o repertório e o momento do paciente.", hint: "Considere ajustes de ritmo, reforçadores e nível de exigência." },
  { id: "documentation", dimension: "technical", critical: false, text: "Produz documentação clínica de qualidade dentro dos prazos.", hint: "Considere evoluções, relatórios, assinaturas e pendências acumuladas." },
  { id: "feedback_uptake", dimension: "technical", critical: false, text: "Incorpora na prática os feedbacks recebidos da supervisão.", hint: "Considere se as orientações da última devolutiva apareceram nas sessões seguintes." },

  { id: "punctuality", dimension: "behavioral", critical: false, text: "Cumpre a escala com pontualidade e assiduidade.", hint: "Considere atrasos, faltas não justificadas e remanejamentos de última hora." },
  { id: "family_communication", dimension: "behavioral", critical: false, text: "Comunica-se com a família com clareza, acolhimento e dentro do seu papel.", hint: "Considere devolutivas de porta, alinhamento com a supervisão e limites de escopo." },
  { id: "teamwork", dimension: "behavioral", critical: false, text: "Colabora com colegas, coordenação e demais especialidades.", hint: "Considere troca de informações, disponibilidade e postura em reuniões de caso." },
  { id: "ethics", dimension: "behavioral", critical: true, text: "Mantém postura ética e sigilo das informações do paciente.", hint: "Considere conduta em registros, conversas, redes sociais e uso de imagem." },
  { id: "emotional_regulation", dimension: "behavioral", critical: false, text: "Mantém regulação emocional em situações de estresse ou crise.", hint: "Considere reação a comportamentos intensos, conflitos e imprevistos da rotina." },
  { id: "ownership", dimension: "behavioral", critical: false, text: "Assume responsabilidade e iniciativa sobre as próprias demandas.", hint: "Considere antecipação de problemas, cobrança externa necessária e autonomia." },
];

export const OPTIONS: { score: Score; label: string; tag: TagVariant }[] = [
  { score: 1, label: "Abaixo do esperado", tag: "red" },
  { score: 2, label: "Em desenvolvimento", tag: "orange" },
  { score: 3, label: "Atende ao esperado", tag: "light-blue" },
  { score: 4, label: "Referência para a equipe", tag: "green" },
];

export const optionOf = (score: number | undefined) => OPTIONS.find((o) => o.score === score);

export type Level = "consolidated" | "developing" | "action_plan";

export const LEVELS: Record<Level, { label: string; tag: TagVariant; message: string }> = {
  consolidated: { label: "Consolidado", tag: "green", message: "Desempenho consolidado. Mantenha a supervisão na periodicidade padrão." },
  developing: { label: "Em desenvolvimento", tag: "yellow", message: "Há competências a desenvolver. Combine metas com o profissional e reavalie no próximo ciclo." },
  action_plan: { label: "Plano de ação", tag: "red", message: "Desempenho exige plano de ação formal, supervisão próxima e reavaliação em até 30 dias." },
};

export const MAX_POINTS = QUESTIONS.length * 4;

export type Answers = Partial<Record<string, Score>>;

export type DimensionResult = Dimension & { total: number; max: number };

export type Result = {
  total: number;
  answered: number;
  complete: boolean;
  level: Level | null;
  /** O primeiro item crítico com nota 1 ou 2, com o número dele (1 a 12). */
  critical: { question: Question; number: number } | null;
  dimensions: DimensionResult[];
};

/**
 * 38 a 48 é Consolidado, 26 a 37 Em desenvolvimento e 12 a 25 Plano de ação.
 * Nota 1 ou 2 num item crítico leva a Plano de ação, qualquer que seja o total.
 */
export function scoreOf(answers: Answers): Result {
  const values = QUESTIONS.map((q) => answers[q.id]);
  const answered = values.filter(Boolean).length;
  const total = values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
  const complete = answered === QUESTIONS.length;
  const index = complete ? QUESTIONS.findIndex((q) => q.critical && (answers[q.id] ?? 0) <= 2) : -1;
  const critical = index >= 0 ? { question: QUESTIONS[index]!, number: index + 1 } : null;
  let level: Level | null = null;
  if (complete) level = critical || total <= 25 ? "action_plan" : total <= 37 ? "developing" : "consolidated";
  const dimensions = DIMENSIONS.map((d) => {
    const questions = QUESTIONS.filter((q) => q.dimension === d.id);
    return { ...d, total: questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0), max: questions.length * 4 };
  });
  return { total, answered, complete, level, critical, dimensions };
}

/** Em desenvolvimento e Plano de ação pedem o plano combinado. */
export const planRequired = (level: Level | null) => level === "developing" || level === "action_plan";

export type Feedback = {
  strengths: string;
  improvements: string;
  actionPlan: string;
  /** A devolutiva já foi conversada com o profissional. */
  shared: boolean;
};

export type Reviewer = { name: string; avatarUrl?: string; role: string };

export type Review = {
  id: string;
  /** `dd/mm/aaaa`, do log de criação. */
  date: string;
  /** "3º trimestre · 2026". */
  cycle: string;
  author: Reviewer;
  answers: Answers;
  feedback: Feedback;
  /** O último log de edição. */
  edited?: { by: string; at: string };
};

/** O ciclo trimestral de uma data `aaaa-mm-dd`. */
export function cycleOf(isoDate: string) {
  const [year, month] = isoDate.split("-").map(Number);
  return `${Math.floor((month! - 1) / 3) + 1}º trimestre · ${year}`;
}

/** `translated_professional_role/1`. */
export const ROLE_LABELS: Record<string, string> = {
  coordinator: "COORDENADOR",
  supervisor: "SUPERVISOR",
};

export type ReviewPolicy = { create: boolean; edit: boolean; delete: boolean };

/**
 * Novo, ainda não há policy no Phoenix. Proposta: supervisão e coordenação
 * avaliam; admin, admin de clínica e pessoas veem e excluem; os demais papéis
 * não veem o item no menu.
 */
export function reviewPolicyOf(role: string): (ReviewPolicy & { view: boolean }) {
  const evaluator = role === "coordinator" || role === "supervisor";
  const manager = role === "admin" || role === "clinic_admin" || role === "people";
  return { view: evaluator || manager, create: evaluator, edit: evaluator, delete: evaluator || manager };
}
