import type { ScreenProps } from "@brucesantos/design-space";
import type { PlanCoverage as Plan, PlanCoverageData } from "../contracts/index.js";
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
  coverageFix,
  coverageLabel,
  coverageState,
  coveredByOmission,
  invisibleToInsurerQueries,
} from "../rules/coverage.js";

/**
 * Vigência dos planos.
 *
 * O filtro por operadora decide cobertura com uma expressão de dois ramos:
 * ambas as datas dentro do período, **ou** ambas nulas. São quatro combinações
 * possíveis e ele reconhece duas.
 *
 * A combinação que fica de fora é a mais natural de todas: preencher o início e
 * deixar o fim vazio, que é como se registra "começou em março e continua". Ela
 * não cobre data nenhuma, nunca, e o paciente some das consultas por operadora
 * sem erro nenhum.
 *
 * Duas decisões:
 *
 * 1. **O estado quebrado tem nome.** O monólito o produz sem nomeá-lo; nomear é
 *    o que permite alguém decidir se quer mantê-lo.
 *
 * 2. **Só o estado quebrado sugere ação.** Os outros três são situações
 *    legítimas — inclusive "fora da vigência", que é um plano vencido de
 *    verdade. Sugerir correção neles seria ruído.
 */
export function PlanCoverageScreen({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as vigências" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const coverage = data as PlanCoverageData | null;
  if (!coverage) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (coverage.plans.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum plano cadastrado"
        description="A vigência de cada plano decide se o paciente aparece nas consultas por operadora."
      />,
    );
  }

  const invisiveis = invisibleToInsurerQueries(coverage);
  const porOmissao = coveredByOmission(coverage);

  return wrap(
    context,
    <div className="space-y-4">
      {invisiveis.length > 0 && (
        <Notice
          tone="danger"
          title={`${invisiveis.length} ${invisiveis.length === 1 ? "plano some" : "planos somem"} de qualquer consulta por operadora`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {invisiveis.map((plan) => (
              <li key={plan.id}>
                {plan.patientName} — {plan.healthCareName}
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            Com só uma das duas datas, o plano não casa em nenhum ramo do filtro: não cobre data
            nenhuma, nunca. E é a forma mais natural de registrar que a cobertura começou e
            continua — a entrada de dado mais provável produz o pior resultado, sem erro nenhum.
          </p>
        </Notice>
      )}

      {/* A outra ponta da assimetria, dita mesmo sem ser defeito. */}
      {porOmissao.length > 0 && (
        <Notice tone="info" title="Sem nenhuma data, o filtro cobre sempre">
          {porOmissao.map((plan) => plan.patientName).join(", ")} — nenhuma vigência declarada. É
          defensável, para não sumir com cadastro antigo. O que não se decidiu é a assimetria:
          nenhuma data cobre tudo, uma data cobre nada.
        </Notice>
      )}

      <Card as="section">
        <CardHeader title="Planos" hint={`na data de ${formatDate(`${coverage.today}T12:00:00.000-03:00`, locale)}`} />
        <div className="space-y-3 px-5 py-5">
          {coverage.plans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} today={coverage.today} locale={locale} />
          ))}
        </div>
      </Card>
    </div>,
  );
}

function PlanRow({
  plan,
  today,
  locale,
}: {
  plan: Plan;
  today: string;
  locale: string | undefined;
}) {
  const estado = coverageState(plan, today);
  const correcao = coverageFix(plan);

  return (
    <article className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{plan.patientName}</span>
        <span className="text-[0.875rem] text-navy">{plan.healthCareName}</span>
        <Chip
          tone={
            estado === "covered"
              ? "ok"
              : estado === "never-matches"
                ? "danger"
                : estado === "outside"
                  ? "neutral"
                  : "info"
          }
        >
          {coverageLabel(estado)}
        </Chip>
      </div>

      <p className="m-0 mt-1 text-[0.8125rem] text-[var(--fg-2)]">
        {plan.startOfCoverage
          ? `De ${formatDate(`${plan.startOfCoverage}T12:00:00.000-03:00`, locale)}`
          : "Sem início declarado"}
        {" · "}
        {plan.endOfCoverage
          ? `até ${formatDate(`${plan.endOfCoverage}T12:00:00.000-03:00`, locale)}`
          : "sem fim declarado"}
      </p>

      {/* Só o estado quebrado sugere ação: os outros três são legítimos. */}
      {correcao && (
        <p className="m-0 mt-1.5 max-w-[68ch] text-[0.8125rem] font-semibold text-danger-fg">
          {correcao}
        </p>
      )}
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Vigência dos planos"
      subtitle="Quatro combinações de datas, e o filtro reconhece duas"
      breadcrumb={[{ label: "Autorizações", path: "/authorizations" }, { label: "Vigências" }]}
    >
      {children}
    </AppShell>
  );
}
