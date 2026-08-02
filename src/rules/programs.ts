import type { Rule } from "@brucesantos/design-space";
import type {
  Criteria,
  Goal,
  InterventionPlan,
  Objective,
  PlanProgram,
  PlanStep,
  StepPhase,
  StepSessionResult,
} from "../contracts/index.js";

/**
 * Regras do plano de intervenção.
 *
 * É a parte do Bloomy que decide se o paciente aprendeu. O monólito espalha isso
 * por `Programs.PhaseConfiguration`, `MoveProgramToAcquired`,
 * `MoveObjectiveToAcquired` e as consultas `has_unaquired_step?` e
 * `has_unacquired_program?` — quatro lugares para uma decisão só, e nenhum deles
 * enuncia o critério em português.
 *
 * O que está escrito aqui é o enunciado. A conta é simples; o difícil é que ela
 * fica invisível: um passo muda de fase sem que ninguém aperte nada, e quem
 * acompanha o caso precisa conseguir prever a mudança antes de ela acontecer.
 */
export const programRules: Rule[] = [
  {
    id: "mastery-closes-phase",
    statement:
      "Um passo fecha a fase quando atinge o percentual de acerto exigido pelo número de sessões do critério — consecutivas ou cumulativas, conforme configurado.",
    rationale:
      "É o critério que a clínica combina com a família e que sustenta a decisão de avançar. Sem ele explícito na tela, avançar de fase vira opinião de quem está aplicando naquele dia.",
    source: "src/rules/programs.ts",
  },
  {
    id: "consecutive-differs-from-cumulative",
    statement:
      "Critério consecutivo exige as sessões seguidas: uma sessão abaixo do alvo zera a contagem. Cumulativo conta as sessões que atingiram o alvo, em qualquer ordem.",
    rationale:
      "Um passo que oscila atinge o cumulativo e nunca atinge o consecutivo. A oscilação é justamente o que a decisão clínica quer enxergar, e a tela que mostra só 'faltam duas' esconde a diferença.",
    source: "src/rules/programs.ts",
  },
  {
    id: "baseline-has-no-performance-target",
    statement:
      "A linha de base não tem meta de acerto: o monólito força `mastery_performance` a zero. Ela encerra por número de sessões, não por desempenho.",
    rationale:
      "Medir antes de ensinar não tem critério de aprovação. Exibir '0% exigido' como se fosse uma meta faz a linha de base parecer um passo fácil, quando ela é um passo sem nota.",
    source: "src/rules/programs.ts",
  },
  {
    id: "regression-returns-to-previous-phase",
    statement:
      "Quando a fase tem critério de regressão e o desempenho cai abaixo dele, o passo volta para a fase anterior.",
    rationale:
      "Generalização e manutenção existem para detectar perda. Sem regressão, um passo marcado como adquirido carrega para sempre uma medição de meses atrás.",
    source: "src/rules/programs.ts",
  },
  {
    id: "acquisition-cascades-upward",
    statement:
      "Passo adquirido pode fechar o programa; programa adquirido pode fechar o objetivo; objetivo adquirido pode fechar a meta. Cada nível fecha quando não sobra nenhum filho por adquirir.",
    rationale:
      "É como o plano avança sem ninguém marcar nada à mão. Também é como uma tela engana: mostrar o programa como ativo quando o último passo acabou de ser adquirido esconde que o objetivo inteiro fechou.",
    source: "src/rules/programs.ts",
  },
  {
    id: "superseded-version-keeps-its-history",
    statement:
      "Editar um programa em uso cria uma versão nova e aponta a antiga para ela. A antiga não é apagada nem editável: as tentativas já registradas pertencem a ela.",
    rationale:
      "As tentativas foram medidas sob as regras antigas. Apagar a versão anterior apagaria a evolução; editá-la mudaria retroativamente o critério sob o qual o paciente foi avaliado.",
    source: "src/rules/programs.ts",
  },
];

/* ================================================================ domínio */

export const PHASE_ORDER: StepPhase[] = [
  "baseline",
  "intervention",
  "generalization",
  "maintenance",
  "acquired",
];

export function phaseLabel(phase: StepPhase): string {
  return {
    baseline: "Linha de base",
    intervention: "Intervenção",
    generalization: "Generalização",
    maintenance: "Manutenção",
    acquired: "Adquirido",
  }[phase];
}

/**
 * Quantas sessões do histórico já contam para o critério.
 *
 * Implementação de `consecutive-differs-from-cumulative`. O consecutivo lê de
 * trás para frente e para na primeira sessão abaixo do alvo — é o que faz uma
 * recaída zerar semanas de progresso, e é exatamente o comportamento que o
 * critério consecutivo existe para produzir.
 */
export function sessionsTowardMastery(history: StepSessionResult[], criteria: Criteria): number {
  const meets = (session: StepSessionResult) => session.performance >= criteria.performance;

  if (criteria.criteria === "cumulative") {
    return history.filter(meets).length;
  }

  let streak = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (!meets(history[index]!)) break;
    streak += 1;
  }
  return streak;
}

/**
 * Implementação de `mastery-closes-phase` e `baseline-has-no-performance-target`.
 *
 * A linha de base entra pelo mesmo caminho e chega ao mesmo lugar sem esforço:
 * com `performance` zero, toda sessão atende ao alvo, e o critério vira contagem
 * pura de sessões. Escrever um caso especial aqui seria descrever uma regra que
 * o monólito não tem.
 */
export function meetsMastery(history: StepSessionResult[], criteria: Criteria): boolean {
  return sessionsTowardMastery(history, criteria) >= criteria.frequency;
}

/** Quantas sessões ainda faltam para fechar a fase. Nunca negativo. */
export function sessionsRemaining(history: StepSessionResult[], criteria: Criteria): number {
  return Math.max(0, criteria.frequency - sessionsTowardMastery(history, criteria));
}

/**
 * Implementação de `regression-returns-to-previous-phase`.
 *
 * Devolve a fase anterior quando o critério de regressão foi atingido, e
 * `undefined` quando não há regressão configurada ou quando ela não disparou.
 * A fase de linha de base não tem para onde voltar.
 */
export function regressionTarget(
  phase: StepPhase,
  history: StepSessionResult[],
  regression?: Criteria,
): StepPhase | undefined {
  if (!regression) return undefined;

  const below = (session: StepSessionResult) => session.performance < regression.performance;
  const count =
    regression.criteria === "cumulative"
      ? history.filter(below).length
      : countTrailing(history, below);

  if (count < regression.frequency) return undefined;

  const index = PHASE_ORDER.indexOf(phase);
  return index > 0 ? PHASE_ORDER[index - 1] : undefined;
}

function countTrailing(
  history: StepSessionResult[],
  predicate: (session: StepSessionResult) => boolean,
): number {
  let streak = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (!predicate(history[index]!)) break;
    streak += 1;
  }
  return streak;
}

/**
 * Critério vigente para o passo, dado o programa.
 *
 * Programa incidental não tem configuração de fase — é registro solto, sem
 * critério de domínio. Devolver `undefined` em vez de um critério vazio obriga a
 * tela a dizer isso, em vez de exibir "0 de 0 sessões".
 */
export function criteriaFor(
  program: PlanProgram,
  phase: StepPhase,
): { mastery: Criteria; regression?: Criteria } | undefined {
  if (!program.phaseConfiguration) return undefined;
  if (phase === "acquired") return undefined;
  return program.phaseConfiguration[phase];
}

/* ============================================================== cascata */

/**
 * Implementação de `acquisition-cascades-upward`, espelhando
 * `has_unaquired_step?` e `has_unacquired_program?`.
 *
 * O monólito pergunta pela negativa — "sobrou algum filho não adquirido?" — e a
 * negativa importa: uma lista vazia fecha o nível. Um objetivo sem programas
 * conta como adquirido, e isso é uma consequência do modelo que vale ser vista
 * na tela antes de alguém descobrir num relatório.
 */
export function programWouldBeAcquired(program: PlanProgram, skipStepIds: string[] = []): boolean {
  return !program.steps.some(
    (step) => step.status !== "acquired" && !skipStepIds.includes(step.id),
  );
}

export function objectiveWouldBeAcquired(
  objective: Objective,
  skipProgramIds: string[] = [],
): boolean {
  return !objective.programs.some(
    (program) => program.status !== "acquired" && !skipProgramIds.includes(program.id),
  );
}

export function goalWouldBeAcquired(goal: Goal, skipObjectiveIds: string[] = []): boolean {
  return !goal.objectives.some(
    (objective) => objective.status !== "acquired" && !skipObjectiveIds.includes(objective.id),
  );
}

/**
 * O que fecharia junto se este passo fosse adquirido agora.
 *
 * Existe para a tela poder avisar antes: marcar o último passo de um programa
 * fecha o programa, e pode fechar o objetivo e a meta em cascata. Quem aplica
 * precisa saber disso na hora de marcar, não no relatório do mês seguinte.
 */
export function cascadeFrom(
  plan: InterventionPlan,
  stepId: string,
): { program?: PlanProgram; objective?: Objective; goal?: Goal } {
  for (const goal of plan.goals) {
    for (const objective of goal.objectives) {
      for (const program of objective.programs) {
        if (!program.steps.some((step) => step.id === stepId)) continue;

        // O passo em questão é tratado como já adquirido — é essa a pergunta.
        if (!programWouldBeAcquired(program, [])) {
          const remaining = program.steps.filter(
            (step) => step.status !== "acquired" && step.id !== stepId,
          );
          if (remaining.length > 0) return {};
        }

        const closesObjective = objectiveWouldBeAcquired(objective, [program.id]);
        if (!closesObjective) return { program };

        const closesGoal = goalWouldBeAcquired(goal, [objective.id]);
        return closesGoal ? { program, objective, goal } : { program, objective };
      }
    }
  }
  return {};
}

/* ============================================================== versão */

/** Implementação de `superseded-version-keeps-its-history`. */
export function isSuperseded(program: PlanProgram): boolean {
  return Boolean(program.nextVersionId);
}

type Decision = { allowed: boolean; reason?: string };

export function canEditProgram(program: PlanProgram, permissions: string[]): Decision {
  if (!permissions.includes("programs.edit")) {
    return { allowed: false, reason: "Seu perfil não edita programas." };
  }
  if (isSuperseded(program)) {
    return {
      allowed: false,
      reason:
        "Esta versão do programa foi substituída. As tentativas registradas pertencem a ela — edite a versão vigente.",
    };
  }
  if (program.status === "acquired") {
    return {
      allowed: false,
      reason: "Programa adquirido não é editado. Crie uma versão nova se o critério mudou.",
    };
  }
  return { allowed: true };
}

/* ============================================================== leitura */

/** Progresso do passo na fase atual, no vocabulário do critério. */
export function stepProgress(
  program: PlanProgram,
  step: PlanStep,
): { done: number; target: number; remaining: number; criteria: Criteria } | undefined {
  const phase = criteriaFor(program, step.phase);
  if (!phase) return undefined;

  return {
    done: sessionsTowardMastery(step.history, phase.mastery),
    target: phase.mastery.frequency,
    remaining: sessionsRemaining(step.history, phase.mastery),
    criteria: phase.mastery,
  };
}

/**
 * O critério em uma frase, do jeito que a clínica fala.
 *
 * "80% de acerto em 3 sessões consecutivas". A linha de base sai diferente
 * porque não tem meta de acerto — e dizer "0% em 3 sessões" seria descrever um
 * critério que ninguém combinou.
 */
export function criteriaSentence(criteria: Criteria, phase: StepPhase): string {
  const sessions = `${criteria.frequency} ${criteria.frequency === 1 ? "sessão" : "sessões"}`;
  const kind = criteria.criteria === "consecutive" ? "consecutivas" : "no total";
  const kindSingular = criteria.criteria === "consecutive" ? "consecutiva" : "no total";
  const agreement = criteria.frequency === 1 ? kindSingular : kind;

  if (phase === "baseline") {
    return `${sessions} registradas, sem meta de acerto`;
  }
  return `${criteria.performance}% de acerto em ${sessions} ${agreement}`;
}
