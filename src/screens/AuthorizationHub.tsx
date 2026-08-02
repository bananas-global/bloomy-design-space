import type { ScreenProps } from "@brucesantos/design-space";
import type { Authorization, AuthorizationsData } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  AuthorizationStatusChip,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  actor,
  canScheduleAgainst,
  daysUntilExpiry,
  maxAllowed,
  nextActionFor,
  queueOrder,
  remaining,
  shortfall,
} from "../rules/authorizations.js";

/**
 * Central de autorizações.
 *
 * O módulo anterior deste repositório chamava isso de "fila de guias" e tinha
 * quatro situações inventadas. O produto tem dez, e quatro delas são lidas como
 * recusa quando não são — a diferença entre elas é a diferença entre reenviar,
 * anexar documento, escrever justificativa e desistir.
 *
 * Três decisões de desenho:
 *
 * 1. **A fila ordena por quem age em seguida, não por data.** Primeiro o que
 *    espera a clínica; depois o solicitante; por último o convênio. Metade do
 *    trabalho da operação é decidir o que é dela.
 *
 * 2. **Cada situação diz qual é a próxima ação.** "Pendente" sozinho não é
 *    acionável, e é assim que quatro situações distintas viram uma só.
 *
 * 3. **Autorizada parcialmente não é verde.** O convênio liberou menos que o
 *    pedido, e a tela mostra a diferença em número — é ela que decide se a
 *    clínica remarca, pede complementar ou conversa com a família.
 */
export function AuthorizationHub({ context }: ScreenProps) {
  const { data, isLoading, error, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a central" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("authorizations.hub")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso à central de autorizações"
        description="A central é de admin, admin de clínica e operação. Nem quem opera a agenda o dia inteiro a alcança — e é ela que recebe a ligação do convênio."
      />,
    );
  }

  const hub = data as AuthorizationsData | null;
  const authorizations = hub?.authorizations ?? [];

  if (authorizations.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma autorização na fila"
        description="Quando um pedido for enviado ao convênio, ele aparece aqui — em ordem de quem precisa agir primeiro."
      />,
      hub,
    );
  }

  const ordered = queueOrder(authorizations);
  const waitingClinic = ordered.filter((item) => actor(item.status) === "clinic");

  return wrap(
    context,
    <div className="space-y-4">
      {waitingClinic.length > 0 && (
        <Notice
          tone="pending"
          title={`${waitingClinic.length} ${waitingClinic.length === 1 ? "autorização espera" : "autorizações esperam"} ação da clínica`}
        >
          A fila abaixo está ordenada por quem age em seguida — clínica, depois solicitante, depois
          convênio — e não por data. Dentro de cada grupo, a mais antiga vem primeiro, porque o
          prazo do convênio corre desde o pedido.
        </Notice>
      )}

      <ul className="m-0 list-none space-y-3 p-0">
        {ordered.map((authorization) => (
          <li key={authorization.id}>
            <AuthorizationCard authorization={authorization} now={hub!.now} />
          </li>
        ))}
      </ul>
    </div>,
    hub,
  );
}

function AuthorizationCard({
  authorization,
  now,
}: {
  authorization: Authorization;
  now: string;
}) {
  const availability = canScheduleAgainst(authorization, now);
  const missing = shortfall(authorization);
  const expiry = daysUntilExpiry(authorization, now);
  const responsible = actor(authorization.status);

  return (
    <Card as="article">
      <CardHeader
        title={`${authorization.guideNumber} · ${authorization.patient.name}`}
        hint={`${authorization.healthCare} · ${categoryLabel(authorization.category)}`}
      />
      <div className="space-y-3 px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <AuthorizationStatusChip status={authorization.status} />
          {responsible !== "none" && <Chip tone="neutral">{actorLabel(responsible)}</Chip>}
        </div>

        {/* A frase que torna a situação acionável. Sem ela, quatro situações
            diferentes viram "pendente" e a fila deixa de servir. */}
        <p className="m-0 max-w-[72ch] text-[0.9375rem] text-navy">
          {nextActionFor(authorization.status)}
        </p>

        {missing !== undefined && (
          <Notice tone="warn" title={`${missing} sessões a menos que o pedido`} level={3}>
            Foram pedidas {authorization.requestedSessions} e o convênio liberou{" "}
            {authorization.requestedSessions - missing}. Agendar as {authorization.requestedSessions}{" "}
            faria a clínica descobrir a diferença no faturamento.
          </Notice>
        )}

        {authorization.errors.length > 0 && (
          <Notice tone="danger" title="O que a integração devolveu" level={3}>
            <ul className="m-0 list-disc space-y-1 pl-5">
              {authorization.errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Notice>
        )}

        {authorization.observation && (
          <p className="m-0 max-w-[72ch] rounded-field bg-ink-50 px-3 py-2 text-[0.875rem] text-navy">
            <span className="font-semibold">Do convênio:</span> {authorization.observation}
          </p>
        )}

        <dl className="m-0 grid grid-cols-[minmax(120px,auto)_1fr] gap-x-6 gap-y-2 text-[0.875rem]">
          <dt className="text-[var(--fg-2)]">Validade</dt>
          <dd className="m-0 text-navy">
            {br(authorization.validFrom)} a {br(authorization.validUntil)}
            {expiry < 0 ? (
              <span className="ml-2 font-semibold text-danger-fg">
                vencida há {Math.abs(expiry)} dias
              </span>
            ) : expiry <= 7 ? (
              <span className="ml-2 font-semibold text-warn-fg">
                vence em {expiry} {expiry === 1 ? "dia" : "dias"}
              </span>
            ) : null}
          </dd>

          <dt className="text-[var(--fg-2)]">Pedido em</dt>
          <dd className="m-0 text-navy">{br(authorization.requestDate)}</dd>

          {authorization.authorizationPassword && (
            <>
              <dt className="text-[var(--fg-2)]">Senha</dt>
              <dd className="m-0 font-mono text-navy">{authorization.authorizationPassword}</dd>
            </>
          )}
        </dl>

        {authorization.packages.length > 0 && (
          <div>
            <h3 className="m-0 text-[0.875rem] font-bold text-navy">Saldo por pacote</h3>
            <ul className="m-0 mt-2 list-none space-y-2 p-0">
              {authorization.packages.map((pkg) => {
                const max = maxAllowed(pkg);
                const left = remaining(pkg);
                return (
                  <li key={pkg.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[0.875rem] text-navy">{pkg.name}</span>
                    <span className="text-[0.875rem] font-semibold text-navy">
                      {pkg.executions} de {max} usadas
                    </span>
                    {left === 0 ? (
                      <Chip tone="danger">Sem saldo</Chip>
                    ) : (
                      <Chip tone="ok">
                        {left} {left === 1 ? "sessão livre" : "sessões livres"}
                      </Chip>
                    )}
                    {pkg.packageType === "capitation" && (
                      <span className="text-[0.8125rem] text-[var(--fg-2)]">
                        capitation: o teto é o máximo mensal, sem multiplicar pela quantidade de{" "}
                        {pkg.quantity}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* A caixa de disponibilidade só repete o motivo quando ele acrescenta
            algo. Quando o bloqueio é a própria situação, a frase de próxima ação
            logo acima já disse tudo — e repeti-la faria o leitor de tela
            anunciar a mesma coisa duas vezes na mesma região. */}
        <div
          className={`rounded-field px-3 py-2 text-[0.875rem] ${
            availability.allowed ? "bg-ok-bg text-ok-fg" : "bg-warn-bg text-navy"
          }`}
        >
          <span className="font-semibold">
            {availability.allowed ? "Serve para agendar hoje." : "Não serve para agendar hoje."}
          </span>
          {!availability.allowed && authorization.status === "authorized" && (
            <span> {availability.reason}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

function br(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function categoryLabel(category: Authorization["category"]): string {
  return { monthly: "Mensal", daily: "Diária", base: "Base do contrato" }[category];
}

function actorLabel(who: "clinic" | "insurer" | "requester"): string {
  return {
    clinic: "Ação da clínica",
    insurer: "Com o convênio",
    requester: "Ação do solicitante",
  }[who];
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  hub?: AuthorizationsData | null,
) {
  return (
    <AppShell
      context={context}
      title="Central de autorizações"
      subtitle={
        hub && hub.authorizations.length > 0
          ? `${hub.authorizations.length} na fila`
          : undefined
      }
      breadcrumb={[{ label: "Central de autorizações" }]}
    >
      {children}
    </AppShell>
  );
}
