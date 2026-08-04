import type { ScreenProps } from "@brucesantos/design-space";
import type { LeadsData } from "../contracts/index.js";
import { LeadShell, ProposalBanner, ValueBar } from "../components/LeadParts.js";
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/primitives.js";
import {
  bySource,
  conversionRate,
  funnelBars,
  isTerminal,
  leadStepLabel,
  leadsWithoutNextAction,
  lostByReason,
  lostByStep,
} from "../rules/leads.js";

/**
 * O painel.
 *
 * Uma decisão de leitura carrega o resto da tela: **o funil conta quem alcançou
 * a etapa, não quem está parado nela.** Contar ocupação atual faz o funil
 * parecer que despenca em toda etapa que a equipe esvazia rápido — e a etapa
 * mais eficiente vira a que mais parece vazar. É a leitura que manda consertar
 * exatamente o que está funcionando.
 *
 * As duas colunas ficam lado a lado de propósito: sem a diferença explícita,
 * quem lê o painel supõe uma das duas e nunca descobre qual.
 */
export function LeadDashboard({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando o painel" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const leadsData = data as LeadsData | null;
  if (!leadsData) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const { leads } = leadsData;

  if (leads.length === 0) {
    return wrap(
      context,
      <div className="space-y-4">
        <ProposalBanner />
        <EmptyState
          title="Nenhum lead no recorte"
          description="Não há dados para este período, unidade e origem. Zeros e barras vazias diriam que o funil despencou — e o que aconteceu foi um filtro."
        />
      </div>,
    );
  }

  const bars = funnelBars(leads);
  const maxReached = bars[0]?.reached ?? 1;
  const convertidos = leads.filter((lead) => lead.step === "converted").length;
  const perdidos = leads.filter((lead) => lead.step === "lost").length;
  const ativos = leads.filter((lead) => !isTerminal(lead.step)).length;
  const semAcao = leadsWithoutNextAction(leadsData).length;
  const motivos = lostByReason(leads);
  const porEtapa = lostByStep(leads);
  const origens = bySource(leads);

  return wrap(
    context,
    <div className="space-y-4">
      <ProposalBanner />

      {/* ---------------------------------------------------------- números */}
      <Card as="section">
        <CardHeader title="No recorte atual" />
        <div className="px-5 py-5">
          <dl className="m-0 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Kpi label="Total de leads" value={leads.length} />
            <Kpi label="Em andamento" value={ativos} />
            <Kpi label="Convertidos" value={convertidos} />
            <Kpi label="Perdidos" value={perdidos} />
            <Kpi label="Taxa de conversão" value={`${conversionRate(leads)}%`} />
          </dl>
          {semAcao > 0 && (
            <p className="m-0 mt-4 text-[0.875rem] font-semibold text-danger-fg">
              {semAcao} {semAcao === 1 ? "lead ativo está" : "leads ativos estão"} sem próxima ação.
            </p>
          )}
        </div>
      </Card>

      {/* ------------------------------------------------------------ funil */}
      <Card as="section">
        <CardHeader
          title="Funil de conversão"
          hint="Quantos alcançaram cada etapa, e a conversão em relação à etapa anterior"
        />
        <div className="space-y-3 px-5 py-5">
          {bars.map((bar) => (
            <ValueBar
              key={bar.step}
              label={bar.label}
              value={bar.reached}
              max={maxReached}
              hint={`${bar.rate}% da etapa anterior · ${bar.current} parados aqui`}
            />
          ))}
          <p className="m-0 max-w-[68ch] pt-2 text-[0.8125rem] text-[var(--fg-2)]">
            <strong className="font-semibold">Alcançaram</strong> inclui quem já passou adiante:
            quem está em “Proposta enviada” também alcançou “Qualificado”.{" "}
            <strong className="font-semibold">Parados aqui</strong> é a ocupação de hoje. Ler a
            segunda como se fosse a primeira faz a etapa que a equipe esvazia mais rápido parecer a
            que mais vaza.
          </p>
        </div>
      </Card>

      {/* ---------------------------------------------------------- perdas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card as="section">
          <CardHeader title="Motivos de perda" hint={`${perdidos} perdidos no recorte`} />
          <div className="space-y-3 px-5 py-5">
            {motivos.length === 0 ? (
              <p className="m-0 text-[0.875rem] text-[var(--fg-2)]">
                Nenhuma perda registrada no recorte.
              </p>
            ) : (
              motivos.map((motivo) => (
                <ValueBar
                  key={motivo.label}
                  label={motivo.label}
                  value={motivo.count}
                  max={motivos[0]!.count}
                  hint={`${motivo.share}%`}
                />
              ))
            )}
          </div>
        </Card>

        <Card as="section">
          <CardHeader title="Onde o funil vaza" hint="As perdas pela etapa de onde saíram" />
          <div className="space-y-3 px-5 py-5">
            {porEtapa.length === 0 ? (
              <p className="m-0 text-[0.875rem] text-[var(--fg-2)]">
                Nenhuma perda registrada no recorte.
              </p>
            ) : (
              <>
                {porEtapa.map((item) => (
                  <ValueBar
                    key={item.step}
                    label={leadStepLabel(item.step)}
                    value={item.count}
                    max={Math.max(...porEtapa.map((entry) => entry.count))}
                  />
                ))}
                <p className="m-0 max-w-[60ch] pt-2 text-[0.8125rem] text-[var(--fg-2)]">
                  Perder por preço na proposta é problema de tabela. Perder por preço no primeiro
                  contato é problema de anúncio. Só o cruzamento decide qual.
                </p>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------------- origem */}
      <Card as="section">
        <CardHeader
          title="Por origem"
          hint="A leitura que responde se o anúncio está pagando"
        />
        <div className="overflow-x-auto px-5 py-5">
          <table className="w-full border-collapse text-left text-[0.875rem]">
            <caption className="sr-only">
              Leads por origem, com quantos converteram, quantos se perderam e a taxa de conversão.
            </caption>
            <thead>
              <tr className="border-b border-[var(--border-soft)]">
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  Origem
                </th>
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  Entraram
                </th>
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  Em andamento
                </th>
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  Converteram
                </th>
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  Perderam
                </th>
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  Taxa
                </th>
              </tr>
            </thead>
            <tbody>
              {origens.map((origem) => (
                <tr key={origem.source} className="border-b border-[var(--border-soft)]">
                  <th scope="row" className="px-2 py-2.5 font-normal text-navy">
                    {origem.label}
                  </th>
                  <td className="px-2 py-2.5 text-navy">{origem.count}</td>
                  <td className="px-2 py-2.5 text-navy">{origem.active}</td>
                  <td className="px-2 py-2.5 text-navy">{origem.converted}</td>
                  <td className="px-2 py-2.5 text-navy">{origem.lost}</td>
                  <td className="px-2 py-2.5 font-semibold text-navy">{origem.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="m-0 mt-4 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
            A taxa só existe porque a conversão grava de qual lead o paciente veio. Origem sem
            paciente é vaidade; paciente sem origem é sorte.
          </p>
        </div>
      </Card>
    </div>,
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="m-0 text-[0.8125rem] text-[var(--fg-2)]">{label}</dt>
      <dd className="m-0 text-[1.375rem] font-bold text-navy">{value}</dd>
    </div>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <LeadShell
      context={context}
      title="Painel de leads"
      subtitle="Onde o funil vaza, e o que cada canal entrega"
      breadcrumb={[{ label: "Leads", path: "/leads" }, { label: "Painel" }]}
    >
      {children}
    </LeadShell>
  );
}
