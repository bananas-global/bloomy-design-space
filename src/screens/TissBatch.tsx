import type { ScreenProps } from "@brucesantos/design-space";
import type { BatchAttempt, TissBatchData } from "../contracts/index.js";
import { formatDateTime, formatMoney } from "../contracts/index.js";
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
  amountNotBilledCents,
  discardedByTheCode,
  indistinguishableInTheLog,
  loggedString,
  lostWithoutRetry,
  outcomeLabel,
  outcomeOwner,
} from "../rules/tissBatch.js";

/**
 * Envio do lote TISS.
 *
 * O lote é a fatura da clínica para a operadora. Três decisões do worker fazem
 * uma fatura sumir sem que ninguém saiba:
 *
 * 1. **`max_attempts: 1`** — nenhuma retentativa. Uma indisponibilidade
 *    momentânea da operadora, que se resolveria sozinha, vira faturamento
 *    perdido.
 *
 * 2. **`rescue → :discard`** — qualquer exceção descarta o job. É o veredito
 *    mais definitivo do Oban: nem erro para investigar, nem nova tentativa.
 *
 * 3. **A recusa e a exceção gravam a mesma string.** E o motivo que a operadora
 *    deu é descartado no `{:error, _reason}`.
 *
 * A decisão desta tela é uma só: **separar os dois fracassos**. São problemas
 * com donos opostos — um se resolve conversando com a operadora, o outro
 * corrigindo código — e pelo registro atual ninguém sabe qual é qual.
 */
export function TissBatch({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando os envios" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const batch = data as TissBatchData | null;
  if (!batch) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  if (batch.attempts.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum lote enviado"
        description="O lote TISS é a fatura da clínica para a operadora. Cada tentativa de envio aparece aqui com o que aconteceu."
      />,
    );
  }

  const perdidos = lostWithoutRetry(batch);
  const naoFaturado = amountNotBilledCents(batch);

  return wrap(
    context,
    <div className="space-y-4">
      {perdidos.length > 0 && (
        <Notice
          tone="danger"
          title={`${formatMoney(naoFaturado, locale)} não ${perdidos.length === 1 ? "foi faturado" : "foram faturados"}, e nada vai tentar de novo`}
        >
          <p className="m-0">
            {/* O nome do parâmetro fica na regra e nas pré-condições do
                cenário. Aqui vale o que a pessoa precisa saber: não há
                segunda tentativa. */}
            A rotina de envio tenta uma vez só. Uma falha de rede na hora do envio significa que o
            lote não vai ser enviado — nem agora, nem depois. E um erro inesperado faz a rotina
            descartar o lote: nem fica registrado como falha para investigar, nem é tentado de
            novo.
          </p>
          <p className="m-0 mt-2">
            A perda não tem sintoma até alguém conferir o repasse da operadora.
          </p>
        </Notice>
      )}

      {perdidos.length > 1 && (
        <Notice tone="warn" title="Os dois fracassos gravam a mesma frase">
          <p className="m-0">
            Recusa da operadora e exceção no código registram{" "}
            <span className="font-mono">“Erro ao gerar o xml”</span>, as duas. São problemas com
            donos opostos: um se resolve conversando, o outro corrigindo código.
          </p>
          <p className="m-0 mt-2">
            E o motivo que a operadora deu é descartado no caminho. Era ele que diria qual é qual.
          </p>
        </Notice>
      )}

      <Card as="section">
        <CardHeader title="Tentativas de envio" hint={`${batch.attempts.length} no total`} />
        <div className="space-y-3 px-5 py-5">
          {batch.attempts.map((attempt) => (
            <Row key={attempt.id} attempt={attempt} locale={locale} />
          ))}
        </div>
      </Card>
    </div>,
  );
}

function Row({ attempt, locale }: { attempt: BatchAttempt; locale: string | undefined }) {
  const dono = outcomeOwner(attempt.outcome);
  const registrado = loggedString(attempt);
  const descartado = discardedByTheCode(attempt);

  return (
    <article className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{attempt.invoiceCode}</span>
        <span className="text-[0.875rem] text-navy">{attempt.insurerName}</span>
        <span className="text-[0.875rem] text-navy">{formatMoney(attempt.amountCents, locale)}</span>
        {/* O desfecho separado, que é o que o registro do job não separa. */}
        <Chip
          tone={
            attempt.outcome === "sent"
              ? "ok"
              : attempt.outcome === "pending"
                ? "neutral"
                : attempt.outcome === "refused"
                  ? "warn"
                  : "danger"
          }
        >
          {outcomeLabel(attempt.outcome)}
        </Chip>
      </div>

      <p className="m-0 mt-1 text-[0.8125rem] text-[var(--fg-2)]">
        {attempt.authorizationCount} guias · {formatDateTime(attempt.attemptedAt, locale)}
      </p>

      {descartado && (
        <p className="m-0 mt-1.5 max-w-[68ch] text-[0.875rem] text-navy">
          <span className="font-semibold">A operadora respondeu:</span> {descartado} — e o código
          descarta essa resposta.
        </p>
      )}

      {registrado && (
        <p className="m-0 mt-1 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
          No registro do job ficou apenas <span className="font-mono">“{registrado}”</span>.
          {dono && <> Resolver é da {dono.toLowerCase()}.</>}
        </p>
      )}

      {indistinguishableInTheLog(attempt) && (
        <p className="m-0 mt-1 text-[0.8125rem] font-semibold text-danger-fg">
          Não vai ser reenviado por conta própria.
        </p>
      )}
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Envio do lote TISS"
      subtitle="A fatura que some sem erro"
      breadcrumb={[{ label: "Fechamentos", path: "/closures" }, { label: "Lote TISS" }]}
    >
      {children}
    </AppShell>
  );
}
