import type { Rule } from "@brucesantos/design-space";
import type { PlanCoverage, PlanCoverageData } from "../contracts/index.js";

/**
 * Regras da cobertura de plano.
 *
 * O filtro `health_care` de `ScheduleFilters` decide se um plano cobre a data
 * assim:
 *
 * ```elixir
 * (pp.start_of_coverage <= ^today and pp.end_of_coverage >= ^today) or
 *   (is_nil(pp.start_of_coverage) and is_nil(pp.end_of_coverage))
 * ```
 *
 * São **quatro** combinações possíveis de datas e a expressão reconhece duas.
 */
export const coverageRules: Rule[] = [
  {
    id: "half-filled-coverage-covers-nothing",
    statement:
      "Um plano com só uma das duas datas preenchida não casa em nenhum dos dois ramos do filtro. Ele não cobre data nenhuma, nunca — e o paciente simplesmente não aparece.",
    rationale:
      "É a forma mais natural de registrar “a cobertura começou em março e continua”: preencher o início e deixar o fim vazio. A entrada de dado mais provável produz o pior resultado, e sem erro nenhum.",
    source: "src/rules/coverage.ts",
  },
  {
    id: "no-dates-means-always-covered",
    statement:
      "Plano sem nenhuma data é tratado como coberto sempre. Ausência total vale mais que ausência parcial.",
    rationale:
      "A escolha é defensável — cadastro antigo sem vigência não deve sumir. O que não se sustenta é a assimetria: nenhuma data cobre tudo, uma data cobre nada, e as duas coisas convivem sem que ninguém tenha decidido.",
    source: "src/rules/coverage.ts",
  },
];

export type CoverageState =
  | "always"
  | "covered"
  | "outside"
  | "never-matches";

/**
 * Implementação de `half-filled-coverage-covers-nothing`.
 *
 * Reproduz a expressão do sistema real, e não a intenção dela. `never-matches`
 * é o estado que o monólito produz sem nomear — nomear é o que permite alguém
 * decidir se quer mantê-lo.
 */
export function coverageState(plan: PlanCoverage, today: string): CoverageState {
  const { startOfCoverage: inicio, endOfCoverage: fim } = plan;

  if (inicio === undefined && fim === undefined) return "always";
  if (inicio === undefined || fim === undefined) return "never-matches";

  return inicio <= today && fim >= today ? "covered" : "outside";
}

export function coverageLabel(state: CoverageState): string {
  switch (state) {
    case "always":
      return "Sem vigência declarada — o filtro trata como coberto sempre";
    case "covered":
      return "Coberto nesta data";
    case "outside":
      return "Fora da vigência nesta data";
    case "never-matches":
      return "Só uma das datas preenchida — não cobre data nenhuma";
  }
}

/**
 * O que a pessoa precisa fazer, quando há o que fazer.
 *
 * Só o estado quebrado devolve instrução: os outros três são situações
 * legítimas, e sugerir ação neles seria ruído.
 */
export function coverageFix(plan: PlanCoverage): string | undefined {
  const temInicio = plan.startOfCoverage !== undefined;
  const temFim = plan.endOfCoverage !== undefined;

  // O estado quebrado não depende da data: é só uma das duas preenchida.
  if (temInicio === temFim) return undefined;

  return temInicio
    ? "Preencha o fim da vigência, ou apague o início. Com só o início, o filtro não encontra este plano em data nenhuma."
    : "Preencha o início da vigência, ou apague o fim. Com só o fim, o filtro não encontra este plano em data nenhuma.";
}

/** Os planos que somem de qualquer consulta por operadora. */
export function invisibleToInsurerQueries(data: PlanCoverageData): PlanCoverage[] {
  return data.plans.filter((plan) => coverageState(plan, data.today) === "never-matches");
}

/** Os que passam por ausência total de vigência — a outra ponta da assimetria. */
export function coveredByOmission(data: PlanCoverageData): PlanCoverage[] {
  return data.plans.filter((plan) => coverageState(plan, data.today) === "always");
}
