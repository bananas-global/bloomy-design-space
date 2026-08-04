import type { ScreenProps } from "@brucesantos/design-space";
import type { Lead, LeadInteractionType, LeadsData } from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import {
  FunnelStepper,
  HealthChip,
  LeadShell,
  ProposalBanner,
  StepChip,
} from "../components/LeadParts.js";
import {
  Button,
  Card,
  CardHeader,
  DetailList,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  LOST_REASONS,
  canAdvanceTo,
  canConvertLead,
  canMarkLost,
  canReopen,
  daysInStep,
  leadSourceLabel,
  leadStepLabel,
  lostFromStep,
  lostReasonLabel,
  missingForQualification,
  nextStep,
  normalizePhone,
  timeInStepLabel,
} from "../rules/leads.js";

const INTERACTION_LABEL: Record<LeadInteractionType, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  visita: "Visita à unidade",
  nota: "Nota",
  proposta: "Proposta enviada",
  etapa: "Mudança de etapa",
  importacao: "Importação",
  automatica: "Mensagem automática",
};

/**
 * O perfil do lead.
 *
 * É a tela que decide a próxima ligação, e por isso ela junta duas coisas que
 * hoje vivem separadas: o que se sabe da família e tudo que já foi conversado
 * com ela. As visitas do modelo atual entram na mesma timeline que ligações,
 * WhatsApp e propostas — em duas listas paralelas, ninguém reconstrói a
 * conversa.
 *
 * O que trava aparece como motivo no próprio controle. "Não é possível
 * converter" manda a pessoa adivinhar; "conclua a avaliação" é acionável.
 */
export function LeadProfile({ params, context }: ScreenProps) {
  const { data, isLoading, error, locale, permissions } = context;

  if (isLoading) return wrap(context, undefined, <LoadingState label="Carregando o lead" />);
  if (error) return wrap(context, undefined, <ErrorState message={error.message} />);

  const leadsData = data as LeadsData | null;
  if (!leadsData) return wrap(context, undefined, <ErrorState message="Não foi possível carregar." />);

  const lead = leadsData.leads.find((item) => item.id === params.id);
  if (!lead) {
    return wrap(
      context,
      undefined,
      <EmptyState
        title="Lead não encontrado"
        description={`Nenhum lead com o identificador ${params.id ?? "informado"} neste recorte.`}
      />,
    );
  }

  const { now } = leadsData;
  const missing = missingForQualification(lead);
  const convert = canConvertLead(lead, permissions);
  const reopen = canReopen(lead);
  const target = nextStep(lead.step);
  const advance = target ? canAdvanceTo(lead, target) : undefined;
  const lostFrom = lostFromStep(lead);
  const pending = lead.tasks.filter((task) => !task.done);
  const done = lead.tasks.filter((task) => task.done);

  return wrap(
    context,
    lead,
    <div className="space-y-4">
      <ProposalBanner />

      {/* ------------------------------------------------- estados terminais */}
      {lead.step === "converted" && (
        <Notice tone="ok" title={`${lead.contactName} virou paciente`}>
          O cadastro guarda de qual lead veio, e é esse vínculo que responde quanto custou o
          paciente que entrou.{" "}
          <a
            href={`/patients/${lead.convertedPatientId}`}
            className="inline-block py-1 font-semibold underline underline-offset-2"
          >
            Abrir o cadastro do paciente
          </a>
          .
        </Notice>
      )}

      {lead.step === "lost" && (
        <Notice tone="danger" title={`Perdido: ${lostReasonLabel(lead.lostReason)}`}>
          Saiu do funil {lostFrom ? `em ${leadStepLabel(lostFrom)}` : "de uma etapa não registrada"}.
          {lead.lostNote && ` ${lead.lostNote}`} Perder por preço na proposta é problema de tabela;
          perder por preço no primeiro contato é problema de anúncio — por isso o motivo fica junto
          da etapa.
        </Notice>
      )}

      {/* --------------------------------------------------------- cabeçalho */}
      <Card as="section">
        <div className="space-y-3 px-5 py-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="m-0 text-[1.0625rem] font-bold text-navy">{lead.contactName}</h2>
            <StepChip step={lead.step} />
            <HealthChip lead={lead} now={now} />
            <span className="text-[0.8125rem] text-[var(--fg-2)]">
              {timeInStepLabel(daysInStep(lead, now))} nesta etapa
            </span>
          </div>

          <FunnelStepper step={lead.step} />

          {/* Contato como link real: um ícone sem nome acessível é um botão
              mudo, e este é o controle que a recepção mais usa. */}
          <div className="flex flex-wrap gap-3">
            {lead.phone ? (
              <>
                <a
                  href={`https://wa.me/55${normalizePhone(lead.phone)}`}
                  className="inline-block py-1 text-[0.875rem] font-semibold underline underline-offset-2"
                >
                  Abrir WhatsApp de {lead.contactName}
                </a>
                <a
                  href={`tel:+55${normalizePhone(lead.phone)}`}
                  className="inline-block py-1 text-[0.875rem] font-semibold underline underline-offset-2"
                >
                  Ligar para {lead.phone}
                </a>
              </>
            ) : (
              <span className="text-[0.875rem] text-[var(--fg-2)]">
                Sem telefone cadastrado — WhatsApp e ligação indisponíveis.
              </span>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-block py-1 text-[0.875rem] font-semibold underline underline-offset-2"
              >
                Enviar e-mail para {lead.email}
              </a>
            )}
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------ qualificação */}
      {missing.length > 0 && lead.step !== "converted" && (
        <Notice
          tone="warn"
          title={`Faltam ${missing.length} ${missing.length === 1 ? "dado" : "dados"} da qualificação`}
        >
          <ul className="m-0 list-disc space-y-0.5 pl-5">
            {missing.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            A avaliação é a primeira coisa cara do funil: ocupa sala, especialista e uma hora de
            agenda. Marcar sem saber a operadora produz avaliação que a família não consegue pagar.
          </p>
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------------- os dados */}
        <div className="space-y-4">
          <Card as="section">
            <CardHeader title="Contato" />
            <div className="px-5 py-5">
              <DetailList
                items={[
                  { label: "Nome", value: lead.contactName },
                  { label: "Telefone", value: lead.phone ?? naoInformado() },
                  { label: "E-mail", value: lead.email ?? naoInformado() },
                  { label: "Cidade", value: lead.city ?? naoInformado() },
                  { label: "Região", value: lead.region ?? naoInformado() },
                ]}
              />
            </div>
          </Card>

          <Card as="section">
            <CardHeader title="Criança e interesse" />
            <div className="px-5 py-5">
              <DetailList
                items={[
                  { label: "Nome", value: lead.childName ?? naoInformado() },
                  {
                    label: "Idade",
                    value:
                      lead.childAgeYears === undefined
                        ? naoInformado()
                        : `${lead.childAgeYears} anos`,
                  },
                  {
                    label: "Nível de suporte",
                    value: lead.supportLevel ? `Nível ${lead.supportLevel}` : naoInformado(),
                  },
                  { label: "Operadora", value: lead.operator ?? naoInformado() },
                  { label: "Unidade", value: lead.unitOfInterest },
                  {
                    label: "Especialidades",
                    value:
                      lead.specialties.length === 0
                        ? naoInformado()
                        : lead.specialties
                            .map((item) => `${item.name} (${item.hoursPerWeek} h/sem)`)
                            .join(", "),
                  },
                  {
                    label: "Disponibilidade",
                    value:
                      lead.availability.length === 0 ? (
                        // A mesma regra do funil de hoje: é a informação mais
                        // barata de coletar agora e a mais cara de perseguir
                        // depois, com a criança já avaliada.
                        <span className="font-semibold text-warn-fg">
                          Nenhuma janela declarada
                        </span>
                      ) : (
                        lead.availability
                          .map(
                            (slot) =>
                              `${["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"][slot.weekday - 1]} das ${slot.startAt} às ${slot.endAt}`,
                          )
                          .join("; ")
                      ),
                  },
                ]}
              />
            </div>
          </Card>

          <Card as="section">
            <CardHeader title="Origem e consentimento" />
            <div className="px-5 py-5">
              <DetailList
                items={[
                  { label: "Origem", value: leadSourceLabel(lead.source) },
                  { label: "Campanha", value: lead.campaign ?? naoInformado() },
                  {
                    label: "UTM",
                    value: lead.utm
                      ? [lead.utm.source, lead.utm.medium, lead.utm.campaign]
                          .filter(Boolean)
                          .join(" · ")
                      : naoInformado(),
                  },
                  { label: "Dono", value: lead.owner ?? "Sem dono" },
                  {
                    label: "Lote importado",
                    value: lead.importBatchId ?? naoInformado(),
                  },
                  {
                    label: "Consentimento",
                    value: lead.consent.given ? (
                      <>
                        {lead.consent.basis === "execucao_de_contrato"
                          ? "Execução de procedimento a pedido do titular"
                          : "Consentimento explícito"}
                        {lead.consent.at &&
                          ` · ${formatDate(lead.consent.at, locale)}`}
                        {lead.consent.channel && ` · ${lead.consent.channel}`}
                      </>
                    ) : (
                      <span className="font-semibold text-warn-fg">Não registrado</span>
                    ),
                  },
                ]}
              />
            </div>
          </Card>
        </div>

        {/* ---------------------------------------- timeline e tarefas */}
        <div className="space-y-4">
          <Card as="section">
            <CardHeader
              title="Linha do tempo"
              hint="Ligações, mensagens, propostas, importações e mudanças de etapa, na mesma ordem"
            />
            <div className="px-5 py-5">
              {lead.interactions.length === 0 ? (
                <p className="m-0 text-[0.875rem] text-[var(--fg-2)]">
                  Nenhuma interação registrada. Toda conversa que não vira linha aqui é uma
                  conversa que o próximo turno vai repetir.
                </p>
              ) : (
                <ol className="m-0 list-none space-y-4 p-0">
                  {[...lead.interactions]
                    .sort((a, b) => (a.at < b.at ? 1 : -1))
                    .map((item) => (
                      <li key={item.id}>
                        <h3 className="m-0 text-[0.875rem] font-semibold text-navy">
                          {INTERACTION_LABEL[item.type]}
                        </h3>
                        <p className="m-0 text-[0.8125rem] text-[var(--fg-2)]">
                          {formatDate(item.at, locale)} às {item.at.slice(11, 16)} · {item.by}
                        </p>
                        <p className="m-0 mt-0.5 max-w-[60ch] text-[0.875rem] text-navy">
                          {item.text}
                        </p>
                      </li>
                    ))}
                </ol>
              )}
              <div className="mt-4">
                <Button id="registrar-interacao">Registrar interação</Button>
              </div>
            </div>
          </Card>

          <Card as="section">
            <CardHeader
              title="Tarefas"
              hint={`${pending.length} pendentes · ${done.length} concluídas`}
            />
            <div className="px-5 py-5">
              {pending.length === 0 ? (
                <p className="m-0 text-[0.875rem] font-semibold text-danger-fg">
                  Nenhuma tarefa aberta. Todo lead ativo deve ter uma próxima ação — sem ela, este
                  lead é indistinguível de um que está indo bem.
                </p>
              ) : (
                <ul className="m-0 list-none space-y-2 p-0">
                  {pending.map((task) => (
                    <li key={task.id} className="flex items-baseline gap-2.5">
                      <input
                        type="checkbox"
                        id={`task-${task.id}`}
                        className="h-6 w-6 shrink-0"
                        aria-label={`Concluir: ${task.title}`}
                      />
                      <label htmlFor={`task-${task.id}`} className="text-[0.875rem] text-navy">
                        {task.title}
                        <span className="block text-[0.8125rem] text-[var(--fg-2)]">
                          vence em {formatDate(task.dueAt, locale)} às {task.dueAt.slice(11, 16)}
                          {task.assignedTo && ` · ${task.assignedTo}`}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <Button id="nova-tarefa">Nova tarefa</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------------ ações */}
      <Card as="section">
        <CardHeader title="Mover no funil" />
        <div className="space-y-3 px-5 py-5">
          {target && advance && (
            <Button
              id="avancar"
              unavailableReason={advance.allowed ? undefined : advance.reason}
            >
              Avançar para {leadStepLabel(target)}
            </Button>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              id="converter"
              variant="primary"
              unavailableReason={convert.allowed ? undefined : convert.reason}
            >
              Efetivar paciente
            </Button>

            <Button
              id="marcar-perdido"
              variant="danger"
              unavailableReason={
                canMarkLost(lead, "sem_resposta").allowed
                  ? undefined
                  : canMarkLost(lead, "sem_resposta").reason
              }
            >
              Marcar como perdido
            </Button>

            <Button id="reabrir" unavailableReason={reopen.allowed ? undefined : reopen.reason}>
              Reabrir em Em contato
            </Button>
          </div>

          {lead.step !== "lost" && lead.step !== "converted" && (
            <div>
              <h3 className="m-0 text-[0.875rem] font-bold text-navy">
                Marcar perdido exige um dos nove motivos
              </h3>
              <ul className="m-0 mt-1.5 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
                {LOST_REASONS.map((reason) => (
                  <li key={reason.key} className="text-[0.8125rem] text-[var(--fg-2)]">
                    {reason.label}
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-2 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
                “Perdemos 40% dos leads” não decide nada. “Perdemos 40% por operadora não atendida,
                todos na qualificação” decide contratar credenciamento em vez de mais anúncio.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>,
  );
}

function naoInformado() {
  return <span className="text-[var(--fg-2)]">Não informado</span>;
}

function wrap(context: ScreenProps["context"], lead: Lead | undefined, children: React.ReactNode) {
  return (
    <LeadShell
      context={context}
      title={lead?.contactName ?? "Lead"}
      subtitle={lead ? `${leadStepLabel(lead.step)} · unidade ${lead.unitOfInterest}` : undefined}
      breadcrumb={[{ label: "Leads", path: "/leads" }, { label: lead?.contactName ?? "Lead" }]}
    >
      {children}
    </LeadShell>
  );
}
