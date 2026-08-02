import type { ScreenProps } from "@brucesantos/design-space";
import type {
  Goal,
  InterventionPlanData,
  Objective,
  PlanProgram,
  PlanStep,
} from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  cascadeFrom,
  criteriaFor,
  criteriaSentence,
  isSuperseded,
  phaseLabel,
  regressionTarget,
  stepProgress,
} from "../rules/programs.js";

/**
 * O plano de intervenção do paciente.
 *
 * Quatro níveis — meta, objetivo, programa, passo — e uma cascata de aquisição
 * que sobe por eles. Três decisões de desenho:
 *
 * 1. **O critério aparece por extenso, junto do progresso.** "2 de 3 sessões"
 *    não diz nada sozinho; "80% de acerto em 3 sessões consecutivas, 2 feitas"
 *    permite prever a próxima sessão. Prever é o trabalho de quem coordena.
 *
 * 2. **Consecutivo e cumulativo são ditos, não implícitos.** Um passo que oscila
 *    atinge um e nunca atinge o outro. Esconder a diferença atrás de uma barra
 *    de progresso apaga exatamente o que a coordenação precisa ver.
 *
 * 3. **A cascata é avisada antes, não depois.** Quando marcar um passo fecharia
 *    programa, objetivo e meta, a tela diz isso enquanto ainda dá para conferir.
 *    Descobrir no relatório do mês seguinte é tarde.
 */
export function InterventionPlanScreen({ context }: ScreenProps) {
  const { data, isLoading, error, locale, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando o plano" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("programs.list")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso aos programas"
        description="O plano de intervenção é visível para coordenação, supervisão e quem atende. Fale com quem administra os acessos da unidade."
      />,
    );
  }

  const planData = data as InterventionPlanData | null;
  const plan = planData?.plan;

  if (!plan || plan.goals.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma meta montada ainda"
        description="O plano nasce de uma avaliação: aplicado o protocolo, as metas e os objetivos aparecem aqui, com os programas de cada um."
      />,
      planData,
    );
  }

  return wrap(
    context,
    <div className="space-y-4">
      {plan.goals.map((goal) => (
        <GoalBlock key={goal.id} goal={goal} plan={plan} locale={locale} />
      ))}
    </div>,
    planData,
  );
}

/* ==================================================================== meta */

function GoalBlock({
  goal,
  plan,
  locale,
}: {
  goal: Goal;
  plan: InterventionPlanData["plan"];
  locale: string | undefined;
}) {
  return (
    <Card as="section">
      <CardHeader
        title={goal.name}
        hint={
          goal.protocolName
            ? `Meta · originada do protocolo ${goal.protocolName}`
            : "Meta"
        }
      />
      <div className="space-y-4 px-5 py-5">
        {goal.status === "acquired" && (
          <Notice tone="ok" title="Meta adquirida" level={3}>
            Todos os objetivos foram adquiridos
            {goal.acquiredAt && ` — o último em ${formatDate(goal.acquiredAt, locale)}`}.
          </Notice>
        )}

        {goal.objectives.map((objective) => (
          <ObjectiveBlock key={objective.id} objective={objective} plan={plan} locale={locale} />
        ))}
      </div>
    </Card>
  );
}

function ObjectiveBlock({
  objective,
  plan,
  locale,
}: {
  objective: Objective;
  plan: InterventionPlanData["plan"];
  locale: string | undefined;
}) {
  return (
    <section className="rounded-card border border-[var(--border-soft)] px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0 text-[15px] font-bold text-navy">{objective.name}</h3>
        {objective.status === "acquired" ? (
          <Chip tone="ok">Objetivo adquirido</Chip>
        ) : (
          <span className="text-[13px] text-[var(--fg-2)]">
            {objective.programs.filter((item) => item.status === "acquired").length} de{" "}
            {objective.programs.length}{" "}
            {objective.programs.length === 1 ? "programa adquirido" : "programas adquiridos"}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {objective.programs.map((program) => (
          <ProgramBlock key={program.id} program={program} plan={plan} locale={locale} />
        ))}
      </div>
    </section>
  );
}

/* ================================================================ programa */

function ProgramBlock({
  program,
  plan,
  locale,
}: {
  program: PlanProgram;
  plan: InterventionPlanData["plan"];
  locale: string | undefined;
}) {
  const superseded = isSuperseded(program);

  return (
    <article
      className={`rounded-field border px-4 py-3.5 ${
        superseded
          ? "border-[var(--border-soft)] bg-ink-50"
          : "border-[var(--border-soft)] bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="m-0 text-[15px] font-semibold text-navy">{program.name}</h4>
        <Chip tone={program.programType === "structured" ? "info" : "neutral"}>
          {program.programType === "structured" ? "Estruturado" : "Incidental"}
        </Chip>
        {program.status === "acquired" && <Chip tone="ok">Adquirido</Chip>}
        {superseded && <Chip tone="warn">Versão substituída</Chip>}
      </div>

      {program.shortDescription && (
        <p className="m-0 mt-1 max-w-[68ch] text-[14px] text-[var(--fg-2)]">
          {program.shortDescription}
        </p>
      )}

      {superseded && (
        <p className="m-0 mt-2 max-w-[68ch] text-[13px] text-navy">
          Substituída por uma versão nova, e mantida porque as tentativas já registradas pertencem a
          ela. Apagá-la apagaria a evolução medida sob o critério anterior.
        </p>
      )}

      {program.programType === "incidental" && (
        <p className="m-0 mt-2 max-w-[68ch] text-[13px] text-[var(--fg-2)]">
          Registro incidental: não tem configuração de fase nem critério de domínio. É contagem, não
          aquisição.
        </p>
      )}

      <ul className="m-0 mt-3 list-none space-y-3 p-0">
        {[...program.steps]
          .sort((a, b) => a.position - b.position)
          .map((step) => (
            <StepRow key={step.id} step={step} program={program} plan={plan} locale={locale} />
          ))}
      </ul>
    </article>
  );
}

/* =================================================================== passo */

function StepRow({
  step,
  program,
  plan,
  locale,
}: {
  step: PlanStep;
  program: PlanProgram;
  plan: InterventionPlanData["plan"];
  locale: string | undefined;
}) {
  const progress = stepProgress(program, step);
  const phase = criteriaFor(program, step.phase);
  const regression = phase
    ? regressionTarget(step.phase, step.history, phase.regression)
    : undefined;
  const cascade = step.status === "acquired" ? {} : cascadeFrom(plan, step.id);

  return (
    <li className="border-t border-[var(--border-soft)] pt-3 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[15px] text-navy">
          {step.position}. {step.name}
        </span>
        <Chip tone={step.phase === "acquired" ? "ok" : "neutral"}>{phaseLabel(step.phase)}</Chip>
      </div>

      {step.status === "acquired" ? (
        <p className="m-0 mt-1 text-[13px] text-[var(--fg-2)]">
          Adquirido{step.acquiredAt && ` em ${formatDate(step.acquiredAt, locale)}`}.
        </p>
      ) : progress ? (
        <>
          <p className="m-0 mt-1 text-[13px] text-navy">
            {/* O critério por extenso, não só o número: é o que permite prever a
                próxima sessão em vez de só constatar a atual. */}
            <span className="font-semibold">{criteriaSentence(progress.criteria, step.phase)}</span>
            {" · "}
            {progress.done} de {progress.target}
            {progress.remaining > 0
              ? ` — ${progress.remaining === 1 ? "falta 1 sessão" : `faltam ${progress.remaining} sessões`}`
              : " — critério atingido"}
          </p>

          {progress.criteria.criteria === "consecutive" && (
            <p className="m-0 mt-0.5 text-[13px] text-[var(--fg-2)]">
              Consecutivas: uma sessão abaixo do alvo zera a contagem.
            </p>
          )}
        </>
      ) : (
        <p className="m-0 mt-1 text-[13px] text-[var(--fg-2)]">Sem critério de domínio.</p>
      )}

      {regression && (
        <div className="mt-2">
          <Notice tone="danger" title={`Regressão para ${phaseLabel(regression)}`} level={3}>
            O desempenho caiu abaixo de {phase?.regression?.performance}% em{" "}
            {phase?.regression?.frequency} sessões{" "}
            {phase?.regression?.criteria === "consecutive" ? "consecutivas" : "no total"}. O passo
            volta para a fase anterior.
          </Notice>
        </div>
      )}

      {(cascade.program || cascade.objective || cascade.goal) && (
        <div className="mt-2">
          <Notice tone="info" title="Marcar este passo fecha mais que o passo" level={3}>
            Adquirir aqui encerra{" "}
            {[
              cascade.program && "o programa",
              cascade.objective && "o objetivo",
              cascade.goal && "a meta inteira",
            ]
              .filter(Boolean)
              .join(", ")}
            . É a cascata do plano — vale conferir antes de marcar.
          </Notice>
        </div>
      )}

      {step.history.length > 0 && <History step={step} program={program} />}
    </li>
  );
}

/**
 * O histórico de sessões do passo.
 *
 * Cada sessão diz a data e o percentual, e marca se atingiu o alvo. A marcação
 * é textual porque quem lê precisa distinguir "atingiu" de "não atingiu" numa
 * captura em preto e branco — e porque o que zera uma contagem consecutiva é
 * justamente a sessão abaixo do alvo, que precisa saltar aos olhos.
 */
function History({ step, program }: { step: PlanStep; program: PlanProgram }) {
  const phase = criteriaFor(program, step.phase);
  const target = phase?.mastery.performance ?? 0;

  return (
    <ol className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
      {step.history.map((session) => {
        const met = session.performance >= target;
        return (
          <li key={session.date}>
            <span
              className={`inline-flex items-center gap-1 rounded-field px-2 py-0.5 text-[13px] font-semibold ${
                met ? "bg-ok-bg text-ok-fg" : "bg-danger-bg text-danger-fg"
              }`}
            >
              <span className="sr-only">
                Sessão de {session.date.slice(8, 10)}/{session.date.slice(5, 7)}:{" "}
                {session.performance} por cento,{" "}
                {met ? "no alvo do critério" : "abaixo do alvo do critério"}.
              </span>
              <span aria-hidden="true">
                {session.date.slice(8, 10)}/{session.date.slice(5, 7)} · {session.performance}%
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  planData?: InterventionPlanData | null,
) {
  return (
    <AppShell
      context={context}
      title={planData?.plan.patient.name ?? "Plano de intervenção"}
      subtitle="Plano de Ensino Individualizado"
      breadcrumb={[{ label: "Pacientes", path: "/patients" }, { label: "Plano" }]}
    >
      {children}
    </AppShell>
  );
}
