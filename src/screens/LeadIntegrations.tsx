import type { ScreenProps } from "@brucesantos/design-space";
import type { LeadsData } from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { LeadShell, ProposalBanner } from "../components/LeadParts.js";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  DetailList,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import { integrationStatus, leadSourceLabel } from "../rules/leads.js";

/**
 * Integrações de captação.
 *
 * A tela existe por causa de um estado só: a integração que parou de receber.
 * Webhook quebrado não dá erro, dá silêncio — e silêncio, num painel, se parece
 * com um dia fraco de anúncio. A clínica descobre semanas depois, quando alguém
 * estranha o funil vazio.
 *
 * Por isso "pausada" e "muda" são estados diferentes com tratamentos
 * diferentes: a primeira é uma decisão, a segunda é um defeito.
 */
export function LeadIntegrations({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as integrações" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const leadsData = data as LeadsData | null;
  if (!leadsData) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const { integrations, now } = leadsData;
  const quebradas = integrations.filter(
    (item) => integrationStatus(item, now).tone === "error",
  );

  return wrap(
    context,
    <div className="space-y-4">
      <ProposalBanner />

      {quebradas.length > 0 && (
        <Notice
          tone="danger"
          title={`${quebradas.length} ${quebradas.length === 1 ? "canal não está recebendo" : "canais não estão recebendo"}`}
        >
          {quebradas.map((item) => item.name).join(", ")}. Uma integração ligada e muda é um
          defeito, não um dia fraco — e é indistinguível de um dia fraco em qualquer contagem de
          leads por origem.
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {integrations.map((integration) => {
          const status = integrationStatus(integration, now);
          const tone =
            status.tone === "ok"
              ? "ok"
              : status.tone === "warn"
                ? "warn"
                : status.tone === "error"
                  ? "danger"
                  : "neutral";

          return (
            <Card key={integration.id} as="section">
              <CardHeader title={integration.name} hint={integration.description} />
              <div className="space-y-3 px-5 py-5">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <Chip tone={tone}>{status.label}</Chip>
                  <span className="text-[0.8125rem] text-[var(--fg-2)]">
                    {integration.lastSignalAt
                      ? `último sinal em ${formatDate(integration.lastSignalAt, locale)} às ${integration.lastSignalAt.slice(11, 16)}`
                      : "nenhum sinal recebido ainda"}
                  </span>
                </div>

                {/* O cartão diz o que fazer, não só em que estado está. */}
                <p className="m-0 max-w-[60ch] text-[0.875rem] text-navy">{status.detail}</p>

                <DetailList
                  items={[
                    {
                      label: "Unidade padrão",
                      value: integration.defaults.unit,
                    },
                    {
                      label: "Origem no funil",
                      value: leadSourceLabel(integration.defaults.source),
                    },
                    {
                      label: "Dono padrão",
                      value: integration.defaults.owner ?? "Distribuir automaticamente",
                    },
                    {
                      label: "Tarefa de primeiro contato",
                      value: integration.defaults.createTask ? "Criada a cada lead" : "Não cria",
                    },
                    ...(integration.kind === "endpoint"
                      ? [
                          { label: "Endpoint", value: integration.endpoint ?? "—" },
                          {
                            label: "Captura de UTM",
                            value: integration.defaults.captureUtm ? "Ligada" : "Desligada",
                          },
                          {
                            label: "Consentimento LGPD",
                            value: integration.defaults.requireConsent
                              ? "Obrigatório — envio sem aceite é recusado"
                              : "Não exigido",
                          },
                        ]
                      : []),
                    ...(integration.kind === "oauth"
                      ? [
                          { label: "Conta", value: integration.account ?? "Não conectada" },
                          { label: "Formulário", value: integration.formId ?? "—" },
                        ]
                      : []),
                    ...(integration.kind === "sheets"
                      ? [
                          { label: "Planilha", value: integration.sheetUrl ?? "—" },
                          { label: "Sincroniza a cada", value: integration.syncEvery ?? "—" },
                        ]
                      : []),
                  ]}
                />

                <div className="flex flex-wrap gap-3">
                  <Button id={`configurar-${integration.id}`}>Configurar</Button>
                  <Button
                    id={`testar-${integration.id}`}
                    unavailableReason={
                      integration.kind === "oauth" && !integration.account
                        ? "Conecte a conta antes de testar a conexão."
                        : undefined
                    }
                  >
                    Testar conexão
                  </Button>
                  {integration.kind === "endpoint" && (
                    <Button id={`copiar-${integration.id}`}>Copiar endpoint e token</Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card as="section">
        <CardHeader title="Por que dois caminhos para os anúncios" />
        <div className="px-5 py-5">
          <p className="m-0 max-w-[68ch] text-[0.875rem] text-navy">
            O Google Ads permite configurar um webhook direto no formulário de lead, sem revisão de
            app — é o caminho rápido. A Meta exige uma permissão de leitura de leads no Graph API, que passa por
            revisão e leva semanas. Enquanto ela não sai, a leitura da planilha do Drive
            cobre o mesmo canal: as planilhas continuam existindo, mas ninguém digita nada nelas.
          </p>
        </div>
      </Card>
    </div>,
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <LeadShell
      context={context}
      title="Integrações"
      subtitle="Por onde os leads entram — e quando param de entrar"
      breadcrumb={[{ label: "Leads", path: "/leads" }, { label: "Integrações" }]}
    >
      {children}
    </LeadShell>
  );
}
