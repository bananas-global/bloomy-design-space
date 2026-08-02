import type { ScreenProps } from "@brucesantos/design-space";
import type { ClosureGenerationData } from "../contracts/index.js";
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
  coveredByDeactivationWorker,
  hoursLostAtTheBoundary,
  hoursWithoutClosure,
  obanOutcome,
  processedByWorker,
  silentFailures,
  workedButGetsNoClosure,
} from "../rules/closureGeneration.js";

/**
 * Geração mensal de fechamentos.
 *
 * O worker roda na virada, procura quem tem horas registradas no mês anterior e
 * gera um fechamento para cada. Três decisões dessa rotina custam dinheiro, e
 * nenhuma delas produz erro:
 *
 * 1. **A busca filtra por quem está ativo agora**, e não por quem estava ativo
 *    durante o mês fechado. Quem trabalhou e foi desativado antes da virada não
 *    recebe fechamento — e a ausência de um fechamento não gera nada.
 *
 * 2. **O worker devolve `{:ok, ...}` mesmo com falhas.** A contagem de falhas
 *    existe, está no retorno, e não vira erro, nem alerta, nem
 *    reprocessamento. O Oban registra sucesso e não tenta de novo.
 *
 * 3. **O mês fecha três horas antes.** `Date.utc_today()` na virada UTC é 21h
 *    do último dia em Brasília — e é a faixa em que acompanhamento terapêutico
 *    costuma acontecer.
 *
 * Esta tela existe porque nenhuma das três aparece em lugar nenhum do produto.
 */
export function ClosureGeneration({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a geração do mês" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const generation = data as ClosureGenerationData | null;
  if (!generation) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const semFechamento = workedButGetsNoClosure(generation);
  const cobertos = coveredByDeactivationWorker(generation);
  const horasPerdidas = hoursWithoutClosure(generation);
  const falhas = silentFailures(generation);
  const oban = obanOutcome(generation);
  const faixa = hoursLostAtTheBoundary(generation);

  const semNadaAReportar =
    semFechamento.length === 0 && falhas.length === 0 && faixa === undefined;

  return wrap(
    context,
    <div className="space-y-4">
      <Card as="section">
        <CardHeader
          title={`Competência ${generation.month}`}
          hint={`o worker rodou em ${formatDate(generation.ranAt, locale)}`}
        />
        <div className="px-5 py-5">
          {/* O que o Oban registrou, e o que de fato aconteceu. */}
          <p className="m-0 text-[0.9375rem] text-navy">
            O Oban registrou <span className="font-semibold">sucesso</span>:{" "}
            {oban.successes} {oban.successes === 1 ? "fechamento gerado" : "fechamentos gerados"}
            {oban.failures > 0 && (
              <>
                {" "}
                e {oban.failures} {oban.failures === 1 ? "falha" : "falhas"}
              </>
            )}
            .
          </p>
          {oban.failures > 0 && (
            <p className="m-0 mt-1 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
              A contagem de falhas está no retorno do worker e não vira erro. O Oban vê sucesso, não
              tenta de novo, e ninguém é avisado.
            </p>
          )}
        </div>
      </Card>

      {semNadaAReportar && (
        <EmptyState
          title="Virada sem perda"
          description="Todos os profissionais com horas no mês estavam ativos, nenhuma geração falhou, e o worker rodou fora da faixa que desloca o fim do mês."
        />
      )}

      {semFechamento.length > 0 && (
        <Notice
          tone="danger"
          title={`${semFechamento.length} ${semFechamento.length === 1 ? "profissional trabalhou" : "profissionais trabalharam"} e não ${semFechamento.length === 1 ? "recebe" : "recebem"} fechamento`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {semFechamento.map((candidate) => (
              <li key={candidate.id}>
                {candidate.name} — {candidate.hoursInMonth} horas em {generation.month}, desativado
                em{" "}
                {candidate.deactivatedOn
                  ? formatDate(`${candidate.deactivatedOn}T12:00:00.000-03:00`, locale)
                  : "data não informada"}
                .
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            São <span className="font-semibold">{horasPerdidas} horas</span> sem acerto. Há dois
            workers envolvidos e eles quase se cobrem: o mensal pula quem já está inativo, e o de
            desativação gera o fechamento — mas do mês da <span className="font-semibold">data de
            desativação</span>. Sair no dia 1º gera um fechamento do mês novo, vazio, e o mês
            trabalhado fica sem.
          </p>
          <p className="m-0 mt-2">
            E é justamente assim que se registra “trabalhou até o fim do mês”.
          </p>
        </Notice>
      )}

      {/* O caso coberto aparece junto, porque é ele que mostra quão estreito é
          o buraco — e evita que alguém "conserte" o que já funciona. */}
      {cobertos.length > 0 && (
        <Notice tone="info" title="Estes o worker de desativação cobre" level={3}>
          {cobertos.map((candidate) => candidate.name).join(", ")} — saiu dentro do mês fechado, e
          o fechamento é gerado na desativação, pelo mês certo.
        </Notice>
      )}

      {falhas.length > 0 && (
        <Notice tone="danger" title="Falha registrada como sucesso">
          <ul className="m-0 list-disc space-y-1 pl-5">
            {falhas.map((candidate) => (
              <li key={candidate.id}>
                {candidate.name} — {candidate.hoursInMonth} horas, sem fechamento gerado.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            O worker somou esta falha e devolveu sucesso assim mesmo. Sem reprocessamento
            automático, alguém precisa saber procurar.
          </p>
        </Notice>
      )}

      {faixa && (
        <Notice tone="warn" title="O mês fechou três horas antes">
          {faixa} O worker usa a data em UTC, e a virada lá é 21h do último dia aqui — que é
          justamente a faixa em que acompanhamento terapêutico acontece.
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title="Profissionais com horas no mês"
          hint={`${generation.candidates.length} no total`}
        />
        <div className="px-5 py-5">
          <ul className="m-0 list-none space-y-2 p-0">
            {generation.candidates.map((candidate) => {
              const processado = processedByWorker(candidate);
              return (
                <li
                  key={candidate.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-field border border-[var(--border-soft)] px-4 py-2.5"
                >
                  <span className="text-[0.9375rem] font-semibold text-navy">{candidate.name}</span>
                  <span className="text-[0.875rem] text-navy">{candidate.hoursInMonth} horas</span>
                  {/* Três estados, três frases: o worker pulou, tentou e falhou,
                      ou gerou. Só a cor não os distingue. */}
                  <Chip
                    tone={
                      !processado ? "danger" : candidate.generationFailed ? "danger" : "ok"
                    }
                  >
                    {!processado
                      ? "pulado por estar inativo"
                      : candidate.generationFailed
                        ? "tentou e falhou"
                        : "fechamento gerado"}
                  </Chip>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>
    </div>,
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Geração mensal de fechamentos"
      subtitle="Três decisões da rotina que custam dinheiro e não produzem erro"
      breadcrumb={[{ label: "Fechamentos", path: "/closures" }, { label: "Geração do mês" }]}
    >
      {children}
    </AppShell>
  );
}
