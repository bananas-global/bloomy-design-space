import type { ScreenProps } from "@brucesantos/design-space";
import type { LeadsData } from "../contracts/index.js";
import { HealthChip, LeadShell, ProposalBanner, StepChip } from "../components/LeadParts.js";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  daysInStep,
  isTerminal,
  leadSourceLabel,
  openTasks,
  timeInStepLabel,
} from "../rules/leads.js";

/**
 * A lista, para trabalhar em lote.
 *
 * O quadro responde "como está o funil"; a lista responde "quero mexer em
 * trinta de uma vez". As duas leem o mesmo filtro de propósito — trocar de
 * visão e perder o recorte é o jeito mais rápido de a pessoa desistir da lista
 * e voltar a exportar planilha.
 *
 * A ação em massa mais perigosa é marcar perdido, e ela **não** pode dispensar
 * o motivo só porque são muitos: um lote de trinta "perdidos" sem motivo é o
 * mesmo buraco na leitura do funil, multiplicado.
 */
export function LeadList({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando os leads" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const leadsData = data as LeadsData | null;
  if (!leadsData) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const { leads, now } = leadsData;

  if (leads.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhum lead neste recorte"
        description="Os filtros são os mesmos do quadro. Limpe o recorte para ver o funil inteiro."
      />,
    );
  }

  return wrap(
    context,
    <div className="space-y-4">
      <ProposalBanner />

      <div className="flex flex-wrap gap-3">
        <Button id="ver-quadro">Ver como quadro</Button>
        <Button id="exportar-csv">Exportar CSV</Button>
      </div>

      <Notice tone="info" title="Ações em massa" level={2}>
        Com leads selecionados, ficam disponíveis atribuir dono, mudar de etapa e marcar perdido.
        Marcar perdido em lote continua exigindo motivo — um para todos ou um por lead. Trinta
        perdas sem motivo abrem o mesmo buraco na leitura do funil, multiplicado por trinta.
      </Notice>

      <Card as="section">
        <CardHeader title="Todos os leads" hint={`${leads.length} no recorte atual`} />
        <div className="overflow-x-auto px-5 py-5">
          <table className="w-full border-collapse text-left text-[0.875rem]">
            <caption className="sr-only">
              Leads do recorte atual, com origem, operadora, dono, próxima ação e tempo na etapa.
            </caption>
            <thead>
              <tr className="border-b border-[var(--border-soft)]">
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  <span className="sr-only">Selecionar</span>
                </th>
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  Contato
                </th>
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  Etapa
                </th>
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  Origem
                </th>
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  Operadora
                </th>
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  Dono
                </th>
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  Próxima ação
                </th>
                <th scope="col" className="px-2 py-2 font-semibold text-navy">
                  Tempo na etapa
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const pending = openTasks(lead);
                return (
                  <tr key={lead.id} className="border-b border-[var(--border-soft)] align-top">
                    <td className="px-2 py-2.5">
                      <input
                        type="checkbox"
                        id={`sel-${lead.id}`}
                        className="h-6 w-6 shrink-0"
                        aria-label={`Selecionar ${lead.contactName}`}
                      />
                    </td>
                    <th scope="row" className="px-2 py-2.5 font-normal">
                      <a
                        href={`/leads/${lead.id}`}
                        className="inline-block py-1 font-semibold text-navy underline-offset-2 hover:underline"
                      >
                        {lead.contactName}
                      </a>
                      <span className="block text-[0.8125rem] text-[var(--fg-2)]">
                        {lead.childName ?? "Criança não informada"}
                      </span>
                    </th>
                    <td className="px-2 py-2.5">
                      <StepChip step={lead.step} />
                    </td>
                    <td className="px-2 py-2.5 text-navy">{leadSourceLabel(lead.source)}</td>
                    <td className="px-2 py-2.5 text-navy">{lead.operator ?? "Não informada"}</td>
                    <td className="px-2 py-2.5 text-navy">{lead.owner ?? "Sem dono"}</td>
                    <td className="px-2 py-2.5">
                      {isTerminal(lead.step) ? (
                        <span className="text-[var(--fg-2)]">—</span>
                      ) : pending.length > 0 ? (
                        <span className="text-navy">{pending[0]!.title}</span>
                      ) : (
                        <HealthChip lead={lead} now={now} />
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-navy">
                      {timeInStepLabel(daysInStep(lead, now))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>,
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <LeadShell
      context={context}
      title="Leads"
      subtitle="Visão em tabela, para ordenar e agir em lote"
      breadcrumb={[{ label: "Leads" }, { label: "Lista" }]}
    >
      {children}
    </LeadShell>
  );
}
