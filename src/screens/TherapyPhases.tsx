import type { ScreenProps } from "@brucesantos/design-space";
import type { TherapyPhase, TherapyPhasesData } from "../contracts/index.js";
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
  THERAPY_STEPS,
  ambianceIsAmbiguous,
  phasesAreUneven,
  phasesWithoutSpecialty,
  placedPhases,
  specialtyLabel,
  stepLabel,
  stepPosition,
} from "../rules/patients.js";

/**
 * Fase terapêutica.
 *
 * A fase pertence ao par **paciente + especialidade**, e não ao paciente. A
 * mesma criança pode estar em terapia na fonoaudiologia e em ambientação na
 * psicologia, porque cada especialidade entra no caso em momento diferente.
 *
 * É o que distingue este produto de um cadastro de clínica qualquer, e o erro
 * mais fácil de cometer aqui seria um campo único de "fase do paciente" — que
 * obrigaria a escolher qual das especialidades mente.
 *
 * Duas decisões seguem daí:
 *
 * 1. **O percurso é desenhado por especialidade, lado a lado.** Uma linha
 *    única, com a fase "mais avançada" ou "média", esconderia exatamente a
 *    informação que faz alguém agir: a especialidade que ficou para trás.
 *
 * 2. **Ambientação é marcada como ambígua.** É o valor padrão do campo e o
 *    changeset não exige nada, então "ninguém preencheu" e "está começando" são
 *    o mesmo dado. A tela não resolve isso — diz.
 */
export function TherapyPhases({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando o percurso" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const phases = data as TherapyPhasesData | null;
  if (!phases) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const colocadas = placedPhases(phases);
  const soltas = phasesWithoutSpecialty(phases);
  const desigual = phasesAreUneven(phases);

  if (phases.phases.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma fase registrada"
        description={
          phases.specialtiesWithoutPhase.length > 0
            ? `${phases.patient.name} atende em ${phases.specialtiesWithoutPhase.map(specialtyLabel).join(" e ")} e não tem fase registrada em nenhuma. A fase é por especialidade — cada uma tem o percurso dela.`
            : "A fase é registrada por especialidade: cada uma entra no caso em momento diferente e caminha no ritmo dela."
        }
      />,
      phases,
    );
  }

  return wrap(
    context,
    <div className="space-y-4">
      {/* O percurso não caminhar junto é o normal, e é o que a tela mostra. */}
      {desigual && (
        <Notice tone="info" title="O percurso não caminha junto, e não deveria">
          Cada especialidade entra no caso em momento diferente e avança no ritmo dela. Uma fase
          única para o paciente obrigaria a escolher qual delas mente.
        </Notice>
      )}

      {soltas.length > 0 && (
        <Notice
          tone="warn"
          title={`${soltas.length === 1 ? "Uma fase não tem" : `${soltas.length} fases não têm`} especialidade`}
        >
          O cadastro não exige especialidade — `TherapyPhase.changeset/2` não valida nada. Sem ela,
          a fase não pertence a nenhum percurso e nenhuma tela sabe onde mostrá-la. Ela não some do
          banco: some da leitura.
        </Notice>
      )}

      {phases.specialtiesWithoutPhase.length > 0 && (
        <Notice tone="pending" title="Especialidades sem fase registrada">
          {phases.specialtiesWithoutPhase.map(specialtyLabel).join(", ")} — há atendimento e não há
          percurso. É diferente de estar em ambientação.
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title="Percurso por especialidade"
          hint={`${colocadas.length} ${colocadas.length === 1 ? "especialidade" : "especialidades"}`}
        />
        <div className="space-y-4 px-5 py-5">
          {colocadas.map((phase) => (
            <PhaseRow key={phase.id} phase={phase} locale={locale} />
          ))}
        </div>
      </Card>
    </div>,
    phases,
  );
}

function PhaseRow({ phase, locale }: { phase: TherapyPhase; locale: string | undefined }) {
  const position = stepPosition(phase.step);
  const ambiguous = ambianceIsAmbiguous(phase);

  return (
    <article className="rounded-card border border-[var(--border-soft)] px-4 py-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="m-0 text-[15px] font-bold text-navy">
          {phase.specialty ? specialtyLabel(phase.specialty) : "Sem especialidade"}
        </h3>
        <Chip tone={phase.step === "discharge_preparation" ? "ok" : "info"}>
          {stepLabel(phase.step)}
        </Chip>
        <span className="text-[13px] text-[var(--fg-2)]">
          etapa {position} de {THERAPY_STEPS.length}
        </span>
      </div>

      {/* O percurso desenhado: a etapa atual tem texto, não só posição. */}
      <ol className="m-0 mt-2 flex list-none flex-wrap gap-x-2 gap-y-1 p-0">
        {THERAPY_STEPS.map((step, index) => {
          const done = index < position - 1;
          const current = index === position - 1;
          return (
            <li
              key={step}
              className={`text-[13px] ${
                current
                  ? "font-bold text-navy"
                  : done
                    ? "text-navy"
                    : "text-[var(--fg-2)]"
              }`}
            >
              {current && <span className="sr-only">Etapa atual: </span>}
              {done && <span className="sr-only">Etapa concluída: </span>}
              {stepLabel(step)}
              {index < THERAPY_STEPS.length - 1 && (
                <span aria-hidden="true" className="ml-2 text-[var(--fg-2)]">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {ambiguous && (
        <p className="m-0 mt-2 max-w-[68ch] text-[13px] text-[var(--fg-2)]">{ambiguous}</p>
      )}

      <p className="m-0 mt-1.5 text-[13px] text-[var(--fg-2)]">
        Atualizado em {formatDate(phase.updatedAt, locale)}
      </p>
    </article>
  );
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  phases?: TherapyPhasesData,
) {
  return (
    <AppShell
      context={context}
      title="Fase terapêutica"
      subtitle={phases?.patient.name}
      breadcrumb={[{ label: "Pacientes", path: "/patients" }, { label: "Fase terapêutica" }]}
    >
      {children}
    </AppShell>
  );
}
