import type { ScreenProps } from "@brucesantos/design-space";
import type { HealthcareInvoicesData, InvoiceLine } from "../contracts/index.js";
import { formatMoney } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  DetailList,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  billableLines,
  canFinishInvoice,
  excludedLines,
  invoiceTotalCents,
  lineTotalCents,
  linesWithoutAgreement,
  missingInvoiceFields,
  missingTissSetup,
  sessionsWithoutAgreement,
} from "../rules/invoices.js";

/**
 * Fatura de convênio.
 *
 * O último passo do dinheiro: o lote TISS que a clínica envia para receber pelo
 * que atendeu. Duas coisas neste cálculo acontecem em silêncio no monólito, e a
 * tela existe principalmente para desfazer esse silêncio:
 *
 * 1. **Autorização sem atendimento não entra.** O corte é correto — faturar o
 *    que não aconteceu seria pior. O problema é ele ser invisível: a clínica
 *    acha que faturou o mês inteiro e recebe menos.
 *
 * 2. **Autorização sem acordo ativo entra valendo zero.** O monólito soma
 *    `0.0` sem erro e sem aviso. O atendimento aconteceu, a autorização existe,
 *    e o valor some. É o jeito mais silencioso de trabalhar de graça.
 *
 * A tela mostra as duas listas antes do total, e não depois — quem confere
 * precisa vê-las enquanto ainda dá para agir.
 */
export function HealthcareInvoiceScreen({ context }: ScreenProps) {
  const { data, isLoading, error, locale, can, permissions } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a fatura" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("healthcare_invoices.list")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso às faturas de convênio"
        description="As faturas são de admin e admin de clínica. Nem a operação, que cuida do contrato com a operadora, as alcança."
      />,
    );
  }

  const invoiceData = data as HealthcareInvoicesData | null;
  if (!invoiceData) {
    return wrap(context, <ErrorState message="Não foi possível carregar a fatura." />);
  }

  const { invoice } = invoiceData;
  const billable = billableLines(invoice);
  const excluded = excludedLines(invoice);
  const withoutAgreement = linesWithoutAgreement(invoice);
  const atRisk = sessionsWithoutAgreement(invoice);
  const total = invoiceTotalCents(invoice);
  const finish = canFinishInvoice(invoice, permissions);
  const tissGaps = missingTissSetup(invoice);
  const missing = missingInvoiceFields(invoice);

  return wrap(
    context,
    <div className="space-y-4">
      {/* ------------------------------- as duas perdas silenciosas, no topo */}
      {withoutAgreement.length > 0 && (
        <Notice
          tone="danger"
          title={`${atRisk} ${atRisk === 1 ? "sessão atendida vai" : "sessões atendidas vão"} para a fatura valendo zero`}
        >
          <p className="m-0">
            {withoutAgreement.length === 1
              ? "Uma linha não tem"
              : `${withoutAgreement.length} linhas não têm`}{" "}
            acordo ativo com {invoice.healthCare.name}. O sistema soma zero sem reclamar: o
            atendimento aconteceu, a autorização existe, e o valor some.
          </p>
          <p className="m-0 mt-2">
            Quanto se perde não dá para dizer — sem acordo não existe preço a aplicar, e estimar um
            seria inventar um número que a operadora não vai pagar. O que dá para afirmar é o
            tamanho do buraco em atendimentos.
          </p>
        </Notice>
      )}

      {excluded.length > 0 && (
        <Notice
          tone="warn"
          title={`${excluded.length} ${excluded.length === 1 ? "autorização ficou" : "autorizações ficaram"} de fora`}
        >
          Autorização sem nenhum atendimento realizado não entra na fatura. O corte está certo — o
          risco é ele ser invisível e a clínica achar que faturou o mês inteiro.
        </Notice>
      )}

      {tissGaps.length > 0 && (
        <Notice tone="danger" title="Operadora sem cadastro completo para o TISS">
          Falta {tissGaps.join(" e ")} em {invoice.healthCare.name}. Os dois são opcionais no
          cadastro e obrigatórios no lote: o cadastro passa e a geração do XML falha.
        </Notice>
      )}

      {/* ------------------------------------------------------- cabeçalho */}
      <Card as="section">
        <CardHeader
          title={`Fatura ${invoice.healthCare.name}`}
          hint={`Competência de ${br(invoice.periodStart)} a ${br(invoice.periodEnd)}`}
        />
        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={invoice.status === "generated_invoice" ? "neutral" : "pending"}>
              {invoice.status === "generated_invoice" ? "Lote gerado" : "Em montagem"}
            </Chip>
            <Chip tone="info">
              {invoice.invoiceType === "health_care" ? "Convênio" : "Particular"}
            </Chip>
          </div>

          <DetailList
            items={[
              { label: "Registro ANS", value: invoice.healthCare.ansRegister },
              { label: "CNPJ", value: invoice.healthCare.cnpj },
              {
                label: "Código do prestador",
                value: invoice.healthCare.providerCode ?? (
                  <span className="font-semibold text-danger-fg">não cadastrado</span>
                ),
              },
              {
                label: "Código do solicitante",
                value: invoice.healthCare.requesterCode ?? (
                  <span className="font-semibold text-danger-fg">não cadastrado</span>
                ),
              },
              {
                label: "Elegibilidade",
                value: invoice.healthCare.skipEligibility
                  ? "consulta dispensada nesta operadora"
                  : "consultada antes do atendimento",
              },
              { label: "Número do lote", value: invoice.number ?? em() },
              { label: "Protocolo", value: invoice.protocol ?? em() },
              { label: "IGDR", value: invoice.igdr ?? em() },
            ]}
          />
        </div>
      </Card>

      {/* ------------------------------------------------------------ linhas */}
      <Card as="section">
        <CardHeader
          title="Autorizações faturadas"
          hint={`${billable.length} de ${invoice.lines.length} entram no lote`}
        />
        <div className="px-5 py-5">
          {billable.length === 0 ? (
            /* A lista responde "o que entra"; o motivo do botão responde "por
               que não fecha". Mesma causa, perguntas diferentes — e repetir a
               frase faria o leitor de tela anunciá-la duas vezes. */
            <p className="m-0 text-[0.9375rem] text-navy">
              Nenhuma linha entrou no lote: todas as autorizações do período estão sem atendimento
              realizado.
            </p>
          ) : (
            <ul className="m-0 list-none space-y-3 p-0">
              {billable.map((item) => (
                <LineRow key={item.authorizationId} line={item} locale={locale} />
              ))}
            </ul>
          )}

          {billable.length > 0 && (
            <p className="m-0 mt-4 border-t border-[var(--border-soft)] pt-4 text-[1.0625rem] font-bold text-navy">
              Total do lote: {formatMoney(total, locale)}
            </p>
          )}
        </div>
      </Card>

      {excluded.length > 0 && (
        <Card as="section">
          <CardHeader
            title="Fora do lote"
            hint="Autorizações do período sem nenhum atendimento realizado"
          />
          <ul className="m-0 list-none space-y-2 p-5">
            {excluded.map((item) => (
              <li key={item.authorizationId} className="text-[0.875rem]">
                <span className="font-mono text-navy">{item.guideNumber}</span>{" "}
                <span className="text-navy">{item.patientName}</span>{" "}
                <span className="text-[var(--fg-2)]">
                  — {item.packageName}, nenhuma sessão realizada
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ------------------------------------------------------------ fechar */}
      <Card as="section">
        <CardHeader title="Fechar a fatura" hint="Gera o lote TISS e envia à operadora" />
        <div className="px-5 py-5">
          {missing.length > 0 && (
            <p className="m-0 mb-3 max-w-[68ch] text-[0.875rem] text-navy">
              São os identificadores com que a operadora reconhece o lote. Sem eles, o envio existe
              e ninguém consegue rastreá-lo depois — nem a clínica, nem a operadora.
            </p>
          )}
          <Button
            id="fechar-fatura"
            variant="primary"
            unavailableReason={finish.allowed ? undefined : finish.reason}
          >
            Gerar lote e fechar
          </Button>
        </div>
      </Card>
    </div>,
    invoiceData,
  );
}

function LineRow({ line, locale }: { line: InvoiceLine; locale: string | undefined }) {
  const zero = line.agreementPriceCents === undefined;

  return (
    <li
      className={`rounded-field border px-4 py-3 ${
        zero ? "border-danger-fg/35 bg-danger-bg" : "border-[var(--border-soft)]"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[0.8125rem] font-bold text-navy">{line.guideNumber}</span>
        <span className="text-[0.9375rem] text-navy">{line.patientName}</span>
        <span className="text-[0.8125rem] text-[var(--fg-2)]">{line.packageName}</span>
      </div>
      <p className="m-0 mt-1 text-[0.875rem] text-navy">
        {line.executedSessions} de {line.quantity}{" "}
        {line.quantity === 1 ? "sessão realizada" : "sessões realizadas"} ·{" "}
        {zero ? (
          <span className="font-semibold text-danger-fg">
            sem acordo ativo — entra valendo {formatMoney(0, locale)}
          </span>
        ) : (
          <>
            {formatMoney(line.agreementPriceCents!, locale)} por sessão ·{" "}
            <span className="font-semibold">{formatMoney(lineTotalCents(line), locale)}</span>
          </>
        )}
      </p>
    </li>
  );
}

function em() {
  return <span className="text-[var(--fg-2)]">não preenchido</span>;
}

function br(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  invoiceData?: HealthcareInvoicesData | null,
) {
  return (
    <AppShell
      context={context}
      title="Fatura de convênio"
      subtitle={invoiceData?.invoice.healthCare.name}
      breadcrumb={[{ label: "Faturas" }]}
    >
      {children}
    </AppShell>
  );
}
