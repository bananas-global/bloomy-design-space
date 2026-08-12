import type { ScreenProps } from "@brucesantos/design-space";
import type { Closure, ClosuresData } from "../contracts/index.js";
import { formatDateTime, formatMoney } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  CLOSURE_FLOW,
  canAttachInvoice,
  canAttachPaymentProof,
  canConfirmPayment,
  canInteract,
  closureStatusLabel,
  expectsInvoice,
  nextStep,
  ownerOf,
  visibleClosures,
} from "../rules/closures.js";
import { Icon } from "../components/Icon.js";

/**
 * Fechamentos do profissional.
 *
 * Sete situações, e o que as torna interessantes não é a quantidade: é que cada
 * uma **troca de dono**. A clínica fecha, o profissional aceita, o profissional
 * emite a nota, a clínica valida e paga.
 *
 * Duas decisões de desenho seguem daí:
 *
 * 1. **De quem é a bola vem antes do valor.** É o que decide o que fazer ao
 *    abrir a tela. Uma barra de progresso mostra quanto falta e esconde a única
 *    pergunta que importa em cada ponto.
 *
 * 2. **A trilha inteira fica visível, com a etapa atual marcada.** Sete estados
 *    são muitos para guardar de cabeça, e quem chega numa etapa raramente sabe
 *    quantas vêm depois.
 */
export function Closures({ context }: ScreenProps) {
  const { data, isLoading, error, locale, persona } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando os fechamentos" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const closuresData = data as ClosuresData | null;
  if (!closuresData) {
    return wrap(context, <ErrorState message="Não foi possível carregar os fechamentos." />);
  }

  const role = persona?.id ?? "";
  const visible = visibleClosures(closuresData.closures, role, closuresData.currentUserId);

  if (visible.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum fechamento para ver aqui"
        description={
          closuresData.closures.length > 0
            ? "Existem fechamentos no mês, e nenhum deles está visível para o seu perfil. O profissional só enxerga os próprios, e só depois de enviados para aceite."
            : "Os fechamentos são gerados na virada do mês, um por profissional com contrato ativo."
        }
      />,
      closuresData,
    );
  }

  return wrap(
    context,
    <ul className="m-0 list-none space-y-3 p-0">
      {visible.map((closure) => (
        <li key={closure.id}>
          <ClosureCard
            closure={closure}
            role={role}
            currentUserId={closuresData.currentUserId}
            locale={locale}
          />
        </li>
      ))}
    </ul>,
    closuresData,
  );
}

function ClosureCard({
  closure,
  role,
  currentUserId,
  locale,
}: {
  closure: Closure;
  role: string;
  currentUserId: string;
  locale: string | undefined;
}) {
  const owner = ownerOf(closure.status);
  const interaction = canInteract(closure, role);
  const invoice = canAttachInvoice(closure, currentUserId);
  const proof = canAttachPaymentProof(closure, role);
  const confirm = canConfirmPayment(closure, role);
  const needsInvoice = expectsInvoice(closure);

  return (
    <Card as="article">
      <CardHeader
        title={`${closure.professional.name} · ${monthLabel(closure.month)}/${closure.year}`}
        hint={closure.professional.specialty}
      />
      <div className="space-y-4 px-5 py-5">
        {/* De quem é a bola vem antes do valor: é o que decide o que fazer. */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={ownerTone(owner.side)}>{owner.label}</Chip>
          <Chip tone="neutral">{closureStatusLabel(closure.status)}</Chip>
        </div>

        <p className="m-0 max-w-[72ch] text-[0.9375rem] text-navy">{nextStep(closure)}</p>

        <p className="m-0 text-[1.375rem] font-bold text-navy">
          {formatMoney(closure.amountCents, locale)}
        </p>

        <Trail current={closure.status} issuesInvoice={closure.issuesInvoice} />

        {!closure.issuesInvoice && (
          <Notice tone="info" title="Contrato sem emissão de nota fiscal" level={3}>
            O contrato deste mês não exige nota. As duas etapas de NF ficam fora do ciclo, e o
            fechamento segue direto para pagamento.
          </Notice>
        )}

        {/* ------------------------------------------------------ anexos */}
        <div className="space-y-3">
          {needsInvoice && (
            <Attachment
              title="Nota fiscal"
              file={closure.invoiceFile}
              locale={locale}
              action="Anexar nota fiscal"
              actionId="anexar-nf"
              decision={invoice}
            />
          )}

          {(closure.status === "pay_invoice" || closure.status === "paid") && (
            <Attachment
              title="Comprovante de pagamento"
              file={closure.paymentProof}
              locale={locale}
              action="Anexar comprovante"
              actionId="anexar-comprovante"
              decision={proof}
            />
          )}
        </div>

        {/* ------------------------------------------------------- ações */}
        <div className="flex flex-wrap items-start gap-3">
          {closure.status === "pay_invoice" && (
            <Button
              id="confirmar-pagamento"
              variant="primary"
              unavailableReason={confirm.allowed ? undefined : confirm.reason}
            >
              Confirmar pagamento
            </Button>
          )}

          {closure.status !== "paid" && closure.status !== "pay_invoice" && (
            <Button
              id="agir"
              variant="primary"
              unavailableReason={interaction.allowed ? undefined : interaction.reason}
            >
              {actionLabel(closure.status)}
            </Button>
          )}
        </div>

        {closure.logs.length > 0 && (
          <div>
            <h3 className="m-0 text-[0.875rem] font-bold text-navy">Histórico</h3>
            <ol className="m-0 mt-2 list-none space-y-2 p-0">
              {closure.logs.map((log, index) => (
                <li key={`${log.at}-${index}`} className="text-[0.8125rem]">
                  <span className="text-navy">{log.observation}</span>
                  <span className="text-[var(--fg-2)]">
                    {" "}
                    — {log.by ?? "sistema"}, {formatDateTime(log.at, locale)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * A trilha das sete etapas.
 *
 * Marcada como lista ordenada com `aria-current` na etapa vigente: quem navega
 * por leitor de tela precisa saber onde está sem contar posições. As etapas de
 * nota fiscal aparecem riscadas quando o contrato não as exige, em vez de
 * sumirem — a trilha continua a mesma, e o que muda é o que se aplica.
 */
function Trail({
  current,
  issuesInvoice,
}: {
  current: Closure["status"];
  issuesInvoice: boolean;
}) {
  const index = CLOSURE_FLOW.indexOf(current);

  return (
    <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {CLOSURE_FLOW.map((status, position) => {
        const skipped =
          !issuesInvoice && (status === "pending_invoice" || status === "validate_nf");
        const done = position < index;
        const here = position === index;

        return (
          <li key={status}>
            <span
              {...(here ? { "aria-current": "step" as const } : {})}
              className={`inline-flex items-center rounded-field px-2.5 py-1 text-[0.8125rem] ${
                here
                  ? "bg-action font-semibold text-white"
                  : done
                    ? "bg-ok-bg text-ok-fg"
                    : skipped
                      ? "bg-ink-50 text-[var(--fg-2)] line-through"
                      : "bg-ink-50 text-[var(--fg-2)]"
              }`}
            >
              <span className="sr-only">
                Etapa {position + 1} de {CLOSURE_FLOW.length}
                {here ? ", atual" : done ? ", concluída" : skipped ? ", fora deste contrato" : ""}:{" "}
              </span>
              {closureStatusLabel(status)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Attachment({
  title,
  file,
  locale,
  action,
  actionId,
  decision,
}: {
  title: string;
  file?: { name: string; at: string };
  locale: string | undefined;
  action: string;
  actionId: string;
  decision: { allowed: boolean; reason?: string };
}) {
  return (
    <div className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <h3 className="m-0 text-[0.875rem] font-bold text-navy">{title}</h3>
      {file ? (
        <p className="m-0 mt-1 text-[0.875rem] text-navy">
          <span className="font-mono">{file.name}</span>{" "}
          <span className="text-[0.8125rem] text-[var(--fg-2)]">
            — anexado em {formatDateTime(file.at, locale)}
          </span>
        </p>
      ) : (
        <p className="m-0 mt-1 text-[0.875rem] text-[var(--fg-2)]">Não anexado.</p>
      )}
      <div className="mt-2">
        <Button id={actionId} unavailableReason={decision.allowed ? undefined : decision.reason}>
          {action}
        </Button>
      </div>
    </div>
  );
}

function actionLabel(status: Closure["status"]): string {
  return {
    closure: "Enviar para aceite",
    wait_accept: "Aceitar valores",
    revision: "Reenviar para aceite",
    pending_invoice: "Marcar nota como enviada",
    validate_nf: "Validar nota fiscal",
    pay_invoice: "Confirmar pagamento",
    paid: "Encerrado",
  }[status];
}

function ownerTone(side: "clinic" | "professional" | "finance" | "none") {
  return { clinic: "info", professional: "pending", finance: "warn", none: "neutral" }[
    side
  ] as "info" | "pending" | "warn" | "neutral";
}

function monthLabel(month: number): string {
  return [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ][month - 1]!;
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  closuresData?: ClosuresData | null,
) {
  const closures = closuresData
    ? visibleClosures(
        closuresData.closures,
        context.persona?.id ?? "",
        closuresData.currentUserId,
      )
    : [];

  return (
    <AppShell
      context={context}
      title="Fechamentos"
      subtitle={
        closuresData && closuresData.closures.length > 0
          ? "Pagamento mensal dos profissionais"
          : undefined
      }
      breadcrumb={[{ label: "Fechamentos" }]}
      showPageHeading={false}
    >
      <div className="space-y-4">
        <Card className="p-5">
          <h1 className="m-0 mb-4 text-2xl font-black text-navy">Fechamento</h1>
          {closuresData && (
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {([[
                "fa-file-signature", "Aguardando Aceite", "wait_accept",
              ], [
                "fa-file-exclamation", "Revisão", "revision",
              ], [
                "fa-cloud-upload", "Nota Fiscal Pendente", "pending_invoice",
              ], [
                "fa-money-bill", "Pagamento", "pay_invoice",
              ]] as const).map(([icon, label, status]) => (
                <div key={status} className="rounded-xl border border-[var(--border-soft)] p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand-blue)]/20 text-[var(--color-brand-blue-dark)]"><Icon name={icon} /></span>
                  <p className="m-0 mt-3 text-2xl font-black text-navy">{closures.filter((item) => item.status === status).length}</p>
                  <p className="m-0 text-sm font-bold text-[var(--fg-2)]">{label}</p>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {["Buscar", "Profissional", "Status", "Mês"].map((label) => (
              <label key={label} className="text-sm font-bold text-navy">{label}<input disabled className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2.5" /></label>
            ))}
          </div>
          {closures.length > 0 && (
            <div className="mt-4 overflow-x-auto" tabIndex={0}>
              <table className="w-full border-collapse text-sm">
                <thead><tr className="border-b border-[var(--border-soft)] text-left text-[var(--fg-2)]"><th className="px-3 py-3">Período</th><th className="px-3 py-3">Profissional</th><th className="px-3 py-3">Valor</th><th className="px-3 py-3">Status</th></tr></thead>
                <tbody>{closures.map((closure) => (
                  <tr key={closure.id} className="border-b border-[var(--border-soft)] last:border-0">
                    <td className="px-3 py-4"><span className="block font-bold text-navy">{monthLabel(closure.month)} {closure.year}</span><span className="text-xs text-[var(--fg-2)]">competência mensal</span></td>
                    <td className="px-3 py-4"><span className="block font-bold text-navy">{closure.professional.name}</span><span className="text-xs text-[var(--fg-2)]">{closure.professional.specialty}</span></td>
                    <td className="px-3 py-4 font-bold text-navy">{formatMoney(closure.amountCents, context.locale)}</td>
                    <td className="px-3 py-4"><Chip tone="neutral">{closureStatusLabel(closure.status)}</Chip></td>
                  </tr>
                ))}</tbody>
              </table>
              <p className="m-0 mt-4 text-sm text-[var(--fg-2)]">Mostrando {closures.length} de {closures.length} registros</p>
            </div>
          )}
        </Card>
        <div>
          <h2 className="m-0 mb-3 text-lg font-black text-navy">Detalhamento da situação</h2>
          {children}
        </div>
      </div>
    </AppShell>
  );
}
