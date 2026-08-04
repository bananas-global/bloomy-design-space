import type { ScreenProps } from "@brucesantos/design-space";
import type { LeadsData } from "../contracts/index.js";
import { LeadCard, LeadShell, ProposalBanner } from "../components/LeadParts.js";
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
  LEAD_FUNNEL_LINE,
  breachesFirstContactSla,
  leadStepLabel,
  leadsWithoutNextAction,
  lostReasonLabel,
  unassignedLeads,
} from "../rules/leads.js";

/**
 * O quadro do funil.
 *
 * Três decisões seguem de como o comercial usa esta tela:
 *
 * 1. **Sem próxima ação tem a mesma cor de atrasado.** São o mesmo problema, e
 *    o vazio é o estado em que a maioria dos leads morre. Pintar de cinza seria
 *    honesto sobre o dado e desonesto sobre a consequência.
 *
 * 2. **Convertido e Perdido ficam recolhidos, com a contagem visível.** Ocupam
 *    duas colunas inteiras com gente que já saiu do funil, e esconder o número
 *    junto seria perder a única leitura que eles ainda dão.
 *
 * 3. **Mover de etapa não depende de arrastar.** O quadro sugere drag & drop, e
 *    a especificação não pode depender dele: quem navega por teclado precisa do
 *    mesmo caminho, e ele fica no perfil do lead.
 */
export function LeadFunnel({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando o funil" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const leadsData = data as LeadsData | null;
  if (!leadsData) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const { leads, now } = leadsData;

  if (leads.length === 0) {
    return wrap(
      context,
      <div className="space-y-4">
        <ProposalBanner />
        <EmptyState
          title="Nenhum lead neste recorte"
          description="Aqui ficam as famílias que procuraram a clínica e ainda não são pacientes — vindas do site, dos anúncios, das planilhas das operadoras, do WhatsApp ou da recepção. Registre a primeira com “Novo lead”, ou traga uma planilha inteira com “Importar planilha”."
        />
        <div className="flex flex-wrap gap-3">
          <Button id="novo-lead-vazio" variant="primary">
            Novo lead
          </Button>
          <Button id="importar-vazio">Importar planilha</Button>
        </div>
      </div>,
    );
  }

  const inLine = LEAD_FUNNEL_LINE.filter((step) => step !== "converted");
  const semAcao = leadsWithoutNextAction(leadsData);
  const semDono = unassignedLeads(leadsData);
  const foraDoSla = leads.filter((lead) => breachesFirstContactSla(lead, now));
  const convertidos = leads.filter((lead) => lead.step === "converted");
  const perdidos = leads.filter((lead) => lead.step === "lost");

  return wrap(
    context,
    <div className="space-y-4">
      <ProposalBanner />

      <div className="flex flex-wrap gap-3">
        <Button id="novo-lead" variant="primary">
          Novo lead
        </Button>
        <Button id="importar">Importar planilha</Button>
        <Button id="ver-lista">Ver como lista</Button>
      </div>

      {/* ------------------------------------------- o que precisa de gente */}
      {semAcao.length > 0 && (
        <Notice
          tone="danger"
          title={`${semAcao.length} ${semAcao.length === 1 ? "lead ativo sem próxima ação" : "leads ativos sem próxima ação"}`}
        >
          {semAcao.map((lead) => lead.contactName).join(", ")}. Lead sem tarefa e lead com tarefa
          vencida recebem o mesmo tratamento porque são o mesmo problema — a ausência de próxima
          ação é indistinguível de “está tudo bem” em qualquer lista.
        </Notice>
      )}

      {foraDoSla.length > 0 && (
        <Notice
          tone="warn"
          title={`${foraDoSla.length} ${foraDoSla.length === 1 ? "lead fora" : "leads fora"} do SLA de primeiro contato`}
        >
          {foraDoSla.map((lead) => lead.contactName).join(", ")}. Quem preencheu um formulário de
          anúncio preencheu o de três concorrentes na mesma tarde — o custo desse lead já saiu do
          caixa antes de alguém ligar.
        </Notice>
      )}

      {semDono.length > 0 && (
        <Notice tone="info" title={`${semDono.length} na fila sem dono`}>
          {semDono.map((lead) => lead.contactName).join(", ")}. Enquanto a distribuição automática
          não existe, a fila sem dono é o lugar onde um lead some sem ninguém notar.
        </Notice>
      )}

      {/* ------------------------------------------------------ as colunas */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {inLine.map((step) => {
          const column = leads.filter((lead) => lead.step === step);
          return (
            <Card key={step} as="section">
              <CardHeader
                title={leadStepLabel(step)}
                hint={`${column.length} ${column.length === 1 ? "lead" : "leads"}`}
              />
              <div className="space-y-3 px-4 py-4">
                {column.length === 0 ? (
                  <p className="m-0 text-[0.8125rem] text-[var(--fg-2)]">
                    Nenhum lead nesta etapa.
                  </p>
                ) : (
                  column.map((lead) => <LeadCard key={lead.id} lead={lead} now={now} />)
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* --------------------------------- saídas do funil, recolhidas */}
      <Card as="section">
        <CardHeader
          title="Saíram do funil"
          hint={`${convertidos.length} convertidos · ${perdidos.length} perdidos`}
        />
        <div className="space-y-4 px-5 py-5">
          <div>
            <h3 className="m-0 text-[0.875rem] font-bold text-navy">
              Convertidos <Chip tone="ok">{convertidos.length}</Chip>
            </h3>
            <ul className="m-0 mt-2 list-none space-y-1 p-0">
              {convertidos.map((lead) => (
                <li key={lead.id} className="text-[0.875rem] text-navy">
                  <a href={`/leads/${lead.id}`} className="inline-block py-1 underline-offset-2 hover:underline">
                    {lead.contactName}
                  </a>{" "}
                  <span className="text-[0.8125rem] text-[var(--fg-2)]">
                    {lead.childName} · virou paciente
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="m-0 text-[0.875rem] font-bold text-navy">
              Perdidos <Chip tone="danger">{perdidos.length}</Chip>
            </h3>
            {/* O motivo vem junto: perdido sem motivo é a linha que não ensina
                nada, e é por isso que marcar exige escolher um. */}
            <ul className="m-0 mt-2 list-none space-y-1 p-0">
              {perdidos.map((lead) => (
                <li key={lead.id} className="text-[0.875rem] text-navy">
                  <a href={`/leads/${lead.id}`} className="inline-block py-1 underline-offset-2 hover:underline">
                    {lead.contactName}
                  </a>{" "}
                  <span className="text-[0.8125rem] text-[var(--fg-2)]">
                    {lostReasonLabel(lead.lostReason)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <p className="m-0 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
        Arrastar um cartão entre colunas muda a etapa e registra no histórico. O mesmo caminho existe
        no perfil do lead, pelo seletor de etapa — a jornada precisa ser completável só por teclado,
        e arrastar não é.
      </p>

      {/* A colisão de enum que a migração precisa resolver. Fica na tela e não
          só na documentação porque é aqui que a nova ordem das etapas aparece
          pela primeira vez para quem vai implementar. */}
      <Notice tone="neutral" title="Atenção na migração: “Avaliação agendada” mudou de lugar">
        A chave <code>scheduled</code> vale “primeira sessão marcada” no funil de hoje, depois de
        “Aguardando plano”. Aqui ela vale “Avaliação agendada”, três etapas antes. Renomear o rótulo
        deixaria todo o histórico de passos com a etapa certa no lugar errado do funil — e a
        primeira leitura do painel mostraria uma conversão para avaliação que nunca aconteceu.
      </Notice>
    </div>,
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <LeadShell
      context={context}
      title="Leads"
      subtitle="Funil comercial — da captação à conversão em paciente"
      breadcrumb={[{ label: "Leads" }, { label: "Funil" }]}
    >
      {children}
    </LeadShell>
  );
}
