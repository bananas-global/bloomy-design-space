import type { ScreenProps } from "@brucesantos/design-space";
import type { PatientGapsData, PatientWithGaps } from "../contracts/index.js";
import { ageInYears } from "../contracts/index.js";
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
  byUrgency,
  countByGap,
  gapConsequence,
  gapLabel,
  shareOfActive,
  worstGap,
} from "../rules/patients.js";

/**
 * Pendências de cadastro.
 *
 * Esta tela não existe no sistema real — a **consulta** existe.
 * `PatientFilters` aceita `missing=plan|unit|hour_map|support_level` e
 * `missing_any=true`, e nenhuma tela faz a pergunta. A informação está a um
 * parâmetro de URL de distância e permanece invisível porque depende de alguém
 * suspeitar que ela exista.
 *
 * Três decisões seguem daí:
 *
 * 1. **A ordem é por consequência, não por nome.** Nível de suporte ausente é
 *    clínico: é o dado que dimensiona a intensidade da intervenção. Sem unidade
 *    o paciente some dos mapas. Sem mapa não há semana pretendida. Sem plano
 *    não há o que o responsável aceite. Listadas como "cadastro incompleto",
 *    as quatro pedem a mesma coisa; nomeadas pela consequência, cada uma tem
 *    dono e urgência próprios.
 *
 * 2. **O tempo em atendimento aparece junto da lacuna.** Uma lacuna de duas
 *    semanas é uma tarefa; a mesma lacuna há dez meses é um processo que não
 *    fecha. Sem o tempo, as duas são idênticas na lista.
 *
 * 3. **O total ganha proporção.** Doze pendências não dizem nada sozinhas: doze
 *    de quinze é um processo quebrado, doze de quatrocentos é uma tarde.
 */
export function PatientGaps({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  if (isLoading) return wrap(context, <LoadingState label="Procurando pendências" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const gaps = data as PatientGapsData | null;
  if (!gaps) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (gaps.patients.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma pendência de cadastro"
        description={`Os ${gaps.activePatients} pacientes ativos têm plano, unidade, mapa de horas e nível de suporte. Nenhuma dessas quatro ausências bloqueia atendimento — por isso vale conferir mesmo quando ninguém reclamou.`}
      />,
    );
  }

  const emOrdem = byUrgency(gaps);
  const porLacuna = countByGap(gaps);
  const proporcao = shareOfActive(gaps);

  return wrap(
    context,
    <div className="space-y-4">
      {/* Nenhuma bloqueia nada: é o que as torna caras. */}
      <Notice tone="info" title="Nenhuma destas ausências impede atendimento">
        O paciente é atendido, as sessões acontecem e os programas rodam com as quatro em aberto. É
        o que as torna caras — um bloqueio se resolve porque incomoda hoje; estas só incomodam
        quando alguém precisa do dado, e aí já faz meses.
      </Notice>

      <Card as="section">
        <CardHeader
          title={`${gaps.patients.length} pacientes com pendência`}
          hint={
            proporcao !== undefined
              ? `${proporcao}% dos ${gaps.activePatients} ativos`
              : undefined
          }
        />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-1.5 p-0">
            {porLacuna.map((linha) => (
              <li key={linha.gap} className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-[0.9375rem] font-semibold text-navy">
                  {linha.count} {linha.count === 1 ? "paciente" : "pacientes"}
                </span>
                <span className="text-[0.9375rem] text-navy">
                  {gapLabel(linha.gap).toLowerCase()}
                </span>
                <span className="text-[0.8125rem] text-[var(--fg-2)]">
                  {gapConsequence(linha.gap).dono}
                </span>
              </li>
            ))}
          </ul>

          {/* O nome dos parâmetros de filtro fica na regra e nas pré-condições
              do cenário, onde quem implementa lê. Aqui vale o que a pessoa
              precisa saber: a informação já existia. */}
          <p className="m-0 mt-3 max-w-[72ch] text-[0.8125rem] text-[var(--fg-2)]">
            O sistema já sabia responder isto — a listagem de pacientes filtra por cada uma das
            quatro ausências. O que faltava era a tela que faz a pergunta: uma consulta que só
            existe como parâmetro de endereço é uma pergunta que ninguém faz.
          </p>
        </div>
      </Card>

      <Card as="section">
        <CardHeader title="Por consequência" hint="Clínico primeiro, depois o que trava a operação" />
        <div className="space-y-3 px-5 py-5">
          {emOrdem.map((entry) => (
            <GapRow key={entry.patient.id} entry={entry} />
          ))}
        </div>
      </Card>
    </div>,
  );
}

function GapRow({ entry }: { entry: PatientWithGaps }) {
  const pior = worstGap(entry);
  const meses = Math.floor(entry.daysInCare / 30);

  return (
    <article className="rounded-card border border-[var(--border-soft)] px-4 py-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="m-0 text-[0.9375rem] font-bold text-navy">{entry.patient.name}</h3>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">
          {ageInYears(entry.patient.birthDate)} anos
        </span>
        {entry.supportLevel !== undefined && (
          <Chip tone="neutral">Nível de suporte {entry.supportLevel}</Chip>
        )}
        {/* O tempo vem junto: duas semanas é tarefa, dez meses é processo que
            não fecha, e na lista as duas são idênticas sem isto. */}
        <span
          className={`text-[0.8125rem] ${meses >= 6 ? "font-semibold text-warn-fg" : "text-[var(--fg-2)]"}`}
        >
          {meses >= 1
            ? `há ${meses} ${meses === 1 ? "mês" : "meses"} em atendimento`
            : `há ${entry.daysInCare} dias em atendimento`}
        </span>
      </div>

      <ul className="m-0 mt-2 list-none space-y-1.5 p-0">
        {entry.gaps.map((gap) => {
          const consequencia = gapConsequence(gap);
          return (
            <li key={gap} className="text-[0.875rem]">
              <span
                className={`font-semibold ${gap === pior ? "text-warn-fg" : "text-navy"}`}
              >
                {gapLabel(gap)}.
              </span>{" "}
              <span className="text-navy">{consequencia.efeito}</span>{" "}
              <span className="text-[var(--fg-2)]">Resolve: {consequencia.dono}.</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Pendências de cadastro"
      subtitle="O que falta e não bloqueia nada"
      breadcrumb={[{ label: "Pacientes", path: "/patients" }, { label: "Pendências" }]}
    >
      {children}
    </AppShell>
  );
}
