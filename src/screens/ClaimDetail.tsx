import { useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type { Claim, FinanceData, RequiredDocument } from "../contracts/index.js";
import { formatDateTime, formatMoney } from "../contracts/index.js";
import { canResubmit, documentProgress, missingDocuments } from "../rules/finance.js";
import { AppShell } from "../components/AppShell.js";
import {
  Button,
  Card,
  CardHeader,
  ClaimStatusChip,
  DetailList,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  Timeline,
} from "../components/primitives.js";

/**
 * Detalhe da guia — o cenário central do módulo financeiro.
 *
 * Três coisas que esta tela existe para provar:
 *
 * 1. **O motivo e o código da recusa ficam à vista.** Sem eles, a analista
 *    reenvia adivinhando e queima um ciclo de dias do convênio.
 * 2. **A recusa é anunciada, não só exibida.** Quem usa leitor de tela precisa
 *    saber que a guia foi recusada ao chegar na página, não descobrir depois de
 *    percorrer a estrutura. É o que o cenário declara em `announces`.
 * 3. **O reenvio bloqueado diz o que falta.** Não desaparece, e não diz apenas
 *    "documentação incompleta": lista os documentos pelo nome.
 */
export function ClaimDetail({ params, context }: ScreenProps) {
  const { data, isLoading, error, permissions, locale } = context;
  const [attached, setAttached] = useState<Set<string>>(new Set());
  const [outcome, setOutcome] = useState<string | undefined>();

  if (isLoading) return wrap(context, <LoadingState label="Carregando a guia" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const claims = (data as FinanceData | null)?.claims ?? [];
  const stored = claims.find((item) => item.id === params.id) ?? claims[0];

  if (!stored) {
    return wrap(
      context,
      <EmptyState
        title="Guia não encontrada"
        description={`Nenhuma guia com o identificador ${params.id ?? "informado"} nesta fila.`}
      />,
    );
  }

  // Anexar documento é o único estado local que esta tela mantém, e existe para
  // que a regra de reenvio possa ser exercitada de ponta a ponta sem sair do
  // cenário: anexa, o botão libera, reenvia.
  const claim: Claim = {
    ...stored,
    documents: stored.documents.map((document) =>
      attached.has(document.id) ? { ...document, received: true } : document,
    ),
  };

  const resubmission = canResubmit(claim, permissions);
  const progress = documentProgress(claim);
  const missing = missingDocuments(claim);

  return wrap(
    context,
    <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <div className="space-y-4">
        {claim.denial && (
          // `live` liga `role="alert"`: a recusa é a informação mais importante da
          // página e precisa ser anunciada na chegada.
          <Notice tone="danger" title={`Guia recusada — ${claim.denial.code}`} live>
            <p className="m-0">{claim.denial.reason}</p>
            <p className="m-0 mt-1.5 text-[13px]">
              Recusada em {formatDateTime(claim.denial.at, locale)} por {claim.insurer}.
            </p>
          </Notice>
        )}

        {claim.status === "pending_documents" && (
          <Notice tone="pending" title="O convênio pediu documento adicional" live>
            A guia não foi recusada. Ela fica em espera até a documentação chegar.
          </Notice>
        )}

        {claim.status === "under_review" && (
          <Notice tone="warn" title="Em análise no convênio">
            Nada a fazer da parte da clínica. A guia foi recebida e aguarda decisão.
          </Notice>
        )}

        <Card as="section">
          <CardHeader title="Guia" />
          <div className="px-5 py-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="m-0 text-xl font-bold text-navy">{claim.procedure}</h3>
              <ClaimStatusChip status={claim.status} />
            </div>

            <DetailList
              items={[
                { label: "Número", value: claim.id },
                {
                  label: "Paciente",
                  value: (
                    <a
                      href={`/patients/${claim.patient.id}`}
                      className="text-action underline-offset-2 hover:underline"
                      onClick={(event) => {
                        event.preventDefault();
                        context.navigate(`/patients/${claim.patient.id}`);
                      }}
                    >
                      {claim.patient.name}
                    </a>
                  ),
                },
                { label: "Convênio", value: claim.insurer },
                {
                  label: "Valor",
                  value: (
                    <span className="font-semibold tabular-nums">
                      {formatMoney(claim.amountCents, locale)}
                    </span>
                  ),
                },
                { label: "Enviada em", value: formatDateTime(claim.submittedAt, locale) },
              ]}
            />
          </div>
        </Card>

        <Card as="section">
          <CardHeader
            title="Documentação"
            hint={`${progress.received} de ${progress.total} documentos anexados`}
          />
          <div className="px-5 py-5">
            <ul className="m-0 list-none space-y-3 p-0">
              {claim.documents.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  canAttach={permissions.includes("claims.retry")}
                  onAttach={() => {
                    setAttached((current) => new Set(current).add(document.id));
                    setOutcome(`${document.name} anexado.`);
                  }}
                />
              ))}
            </ul>
          </div>
        </Card>

        <Card as="section">
          <CardHeader title="Histórico" />
          <div className="px-5 py-5">
            <Timeline events={claim.history} />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card as="section">
          <CardHeader title="Reenvio" />
          <div className="px-5 py-5">
            <p role="status" aria-live="polite" className="m-0 min-h-6 text-[15px] text-navy">
              {outcome}
            </p>

            <div className="mt-3 flex flex-col items-start gap-3">
              <Button
                id="reenviar"
                variant="primary"
                unavailableReason={resubmission.allowed ? undefined : resubmission.reason}
                onClick={() =>
                  setOutcome(`Guia ${claim.id} reenviada ao ${claim.insurer}. Aguardando análise.`)
                }
              >
                Reenviar ao convênio
              </Button>

              <Button variant="ghost" onClick={() => context.navigate("/finance")}>
                Voltar para a fila
              </Button>
            </div>

            {missing.length > 0 && (
              <p className="mt-4 text-[13px] text-[var(--fg-2)]">
                A regra <code>retry-after-document-review</code> existe porque reenvio sem
                documento é recusado de novo, e cada recusa consome um ciclo do prazo do convênio.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>,
    claim,
  );
}

function DocumentRow({
  document,
  canAttach,
  onAttach,
}: {
  document: RequiredDocument;
  canAttach: boolean;
  onAttach: () => void;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-field border border-[var(--border-mid)] px-4 py-3">
      <div className="min-w-0">
        <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-navy">
          {/* O símbolo é decorativo: o estado está no texto ao lado, então quem
              usa leitor de tela recebe a informação sem depender do glifo. */}
          <span aria-hidden="true" className={document.received ? "text-ok-fg" : "text-pending-fg"}>
            {document.received ? "✓" : "○"}
          </span>
          {document.name}
        </p>
        <p className="m-0 mt-0.5 text-[13px] text-[var(--fg-2)]">
          {document.received ? "Anexado" : (document.note ?? "Pendente")}
        </p>
      </div>

      {!document.received && (
        <Button
          unavailableReason={canAttach ? undefined : "Seu perfil não anexa documentos."}
          onClick={onAttach}
        >
          Anexar
        </Button>
      )}
    </li>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode, claim?: Claim) {
  return (
    <AppShell
      context={context}
      title={claim ? claim.procedure : "Guia"}
      subtitle={claim ? `${claim.id} · ${claim.insurer}` : undefined}
      breadcrumb={[{ label: "Financeiro", path: "/finance" }, { label: "Guia" }]}
    >
      {children}
    </AppShell>
  );
}
