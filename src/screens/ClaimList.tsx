import type { ScreenProps } from "@brucesantos/design-space";
import type { Claim, FinanceData } from "../contracts/index.js";
import { formatDate, formatMoney } from "../contracts/index.js";
import { documentProgress } from "../rules/finance.js";
import { AppShell } from "../components/AppShell.js";
import {
  Card,
  ClaimStatusChip,
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/primitives.js";

/**
 * Fila de guias.
 *
 * Ordenada por urgência de ação, não por data: recusada primeiro, depois
 * pendência, depois análise, e autorizada por último. A operação abre esta tela
 * para saber o que resolver, e uma ordem cronológica esconderia a guia recusada
 * de três dias atrás embaixo das enviadas hoje.
 */
const URGENCY: Record<Claim["status"], number> = {
  denied: 0,
  pending_documents: 1,
  under_review: 2,
  resubmitted: 3,
  approved: 4,
};

export function ClaimList({ context }: ScreenProps) {
  const { data, isLoading, error, locale, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando guias" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("authorizations.hub")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso ao financeiro"
        description="Seu perfil não inclui a permissão de leitura do financeiro."
      />,
    );
  }

  const claims = [...((data as FinanceData | null)?.claims ?? [])].sort(
    (a, b) => URGENCY[a.status] - URGENCY[b.status],
  );

  if (claims.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma guia pendente"
        description="Guias enviadas aos convênios aparecem aqui até serem autorizadas."
      />,
    );
  }

  const totalAtRisk = claims
    .filter((claim) => claim.status === "denied" || claim.status === "pending_documents")
    .reduce((sum, claim) => sum + claim.amountCents, 0);

  return wrap(
    context,
    <div className="space-y-4">
      {totalAtRisk > 0 && (
        <Card className="px-5 py-4">
          <p className="m-0 text-[13px] font-black uppercase tracking-wide text-[var(--fg-2)]">
            Aguardando ação da clínica
          </p>
          <p className="m-0 mt-1 text-2xl font-bold tabular-nums text-navy">
            {formatMoney(totalAtRisk, locale)}
          </p>
          <p className="m-0 mt-0.5 text-[13px] text-[var(--fg-2)]">
            Guias recusadas ou com documento pendente. O prazo do convênio corre enquanto elas
            esperam.
          </p>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <table className="w-full border-collapse text-[15px]">
          <caption className="sr-only">
            Guias enviadas aos convênios, ordenadas por urgência de ação
          </caption>
          <thead>
            <tr className="border-b border-[var(--border-soft)] text-left text-[12px] font-black uppercase tracking-wide text-[var(--fg-2)]">
              <th scope="col" className="px-5 py-3">
                Guia
              </th>
              <th scope="col" className="px-5 py-3">
                Convênio
              </th>
              <th scope="col" className="px-5 py-3">
                Valor
              </th>
              <th scope="col" className="px-5 py-3">
                Documentos
              </th>
              <th scope="col" className="px-5 py-3">
                Situação
              </th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => {
              const progress = documentProgress(claim);
              const complete = progress.received === progress.total;
              return (
                <tr key={claim.id} className="border-b border-ink-50 last:border-0">
                  <th scope="row" className="px-5 py-4 text-left align-top font-normal">
                    <a
                      href={`/finance/claims/${claim.id}`}
                      className="font-semibold text-action underline-offset-2 hover:underline"
                      onClick={(event) => {
                        event.preventDefault();
                        context.navigate(`/finance/claims/${claim.id}`);
                      }}
                    >
                      {claim.procedure}
                    </a>
                    <span className="mt-0.5 block text-[13px] text-[var(--fg-2)]">
                      {claim.id} · {claim.patient.name} · enviada em{" "}
                      {formatDate(claim.submittedAt, locale)}
                    </span>
                  </th>
                  <td className="px-5 py-4 align-top">{claim.insurer}</td>
                  <td className="px-5 py-4 align-top tabular-nums font-semibold text-navy">
                    {formatMoney(claim.amountCents, locale)}
                  </td>
                  <td className="px-5 py-4 align-top tabular-nums">
                    {progress.received} de {progress.total}
                    {!complete && (
                      <span className="mt-0.5 block text-[13px] font-semibold text-pending-fg">
                        falta {progress.total - progress.received}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <ClaimStatusChip status={claim.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>,
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Financeiro"
      subtitle="Guias e faturamento por convênio"
    >
      {children}
    </AppShell>
  );
}
