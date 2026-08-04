import type { ScreenProps } from "@brucesantos/design-space";
import type { LeadsData } from "../contracts/index.js";
import { LeadShell, ProposalBanner } from "../components/LeadParts.js";
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import { LEAD_FUNNEL_LINE, canCreateLead, findDuplicate, leadStepLabel } from "../rules/leads.js";

/**
 * Novo lead.
 *
 * O formulário atual pede a criança inteira antes de deixar registrar quem
 * ligou, e o resultado é que a recepção não registra: anota num papel, e o
 * contato vira uma linha de planilha que ninguém revisita. Aqui o mínimo é
 * nome mais um jeito de responder — quinze segundos —, e todo o resto fica
 * numa seção que existe, está visível e é opcional.
 *
 * A duplicidade avisa, não bloqueia. Um bloqueio criaria o caso em que duas
 * crianças da mesma família compartilham o telefone da mãe e a segunda não pode
 * ser registrada.
 */
export function LeadNew({ context }: ScreenProps) {
  const { data, isLoading, error } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando o formulário" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const leadsData = data as LeadsData | null;
  if (!leadsData) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const draft = leadsData.newLeadDraft ?? { contactName: "", phone: "", email: "" };
  const creation = canCreateLead(draft);
  const duplicate = findDuplicate(leadsData, draft);

  return wrap(
    context,
    <div className="space-y-4">
      <ProposalBanner />

      {/* O aviso é `live` porque aparece em resposta ao que a pessoa digitou —
          e a pessoa está olhando para o campo, não para o topo da tela. */}
      {duplicate && duplicate.kind === "lead" && (
        <Notice tone="warn" title="Esse contato já está no funil" live>
          <p className="m-0">
            <strong className="font-semibold">{duplicate.name}</strong> já é um lead, e bateu pelo{" "}
            {duplicate.matchedBy}.{" "}
            <a
              href={`/leads/${duplicate.id}`}
              className="inline-block py-1 font-semibold underline underline-offset-2"
            >
              Abrir o lead existente
            </a>
            .
          </p>
          <p className="m-0 mt-2">
            Criar mesmo assim continua possível: duas crianças da mesma família compartilham o
            telefone da mãe, e a segunda precisa poder ser registrada.
          </p>
        </Notice>
      )}

      {duplicate && duplicate.kind === "patient" && (
        <Notice tone="info" title="Esse contato não é um lead: já é paciente" live>
          <p className="m-0">
            O {duplicate.matchedBy} pertence ao cadastro de{" "}
            <strong className="font-semibold">{duplicate.name}</strong>.{" "}
            <a
              href={`/patients/${duplicate.id}`}
              className="inline-block py-1 font-semibold underline underline-offset-2"
            >
              Abrir o cadastro do paciente
            </a>
            .
          </p>
          <p className="m-0 mt-2">
            Família que já frequenta a clínica e pede uma segunda especialidade não é captação — é
            pedido de ampliação de horas. Tratada como lead, ela recebe uma ligação apresentando a
            clínica que ela já conhece.
          </p>
        </Notice>
      )}

      {/* -------------------------------------------------------- o mínimo */}
      <Card as="section">
        <CardHeader
          title="O mínimo"
          hint="Nome e um jeito de responder. Nada além disto é obrigatório."
        />
        <div className="space-y-4 px-5 py-5">
          <Field
            id="contato-nome"
            label="Nome de quem entrou em contato"
            required
            value={draft.contactName}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="contato-telefone" label="Telefone" value={draft.phone ?? ""} />
            <Field id="contato-email" label="E-mail" value={draft.email ?? ""} />
          </div>
          <p className="m-0 text-[0.8125rem] text-[var(--fg-2)]">
            Telefone <strong className="font-semibold">ou</strong> e-mail. Sem um dos dois, o lead
            entra no funil sem jeito de sair dele.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              id="contato-origem"
              label="Origem"
              options={[
                "Site",
                "Google Ads",
                "Meta Ads",
                "Instagram",
                "WhatsApp",
                "Telefone",
                "Recepção",
                "Indicação",
                "Operadora",
                "Evento",
                "Outro",
              ]}
            />
            <Select id="contato-unidade" label="Unidade de interesse" options={leadsData.units} />
            <Select
              id="contato-dono"
              label="Dono"
              options={["Sem dono", ...leadsData.owners]}
              value={leadsData.owners[0]}
            />
          </div>

          <Select
            id="contato-etapa"
            label="Etapa inicial"
            options={LEAD_FUNNEL_LINE.filter((step) => step !== "converted").map(leadStepLabel)}
          />
        </div>
      </Card>

      {/* -------------------------------------------------------- o resto */}
      <Card as="section">
        <CardHeader
          title="Dados completos"
          hint="Opcionais aqui. Passam a ser exigidos ao agendar a avaliação."
        />
        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="crianca-nome" label="Nome da criança" value="" />
            <Field id="crianca-idade" label="Idade" value="" />
            <Select
              id="crianca-suporte"
              label="Nível de suporte"
              options={["A definir", "Nível 1", "Nível 2", "Nível 3"]}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="contato-operadora"
              label="Operadora"
              options={["Não informado", ...leadsData.operators]}
            />
            <Field id="contato-campanha" label="Campanha" value="" />
          </div>
          <Field id="contato-especialidades" label="Especialidades e horas por semana" value="" />
          <Field id="contato-disponibilidade" label="Janelas de disponibilidade" value="" />
          <Field id="contato-observacao" label="Observação" value="" />

          <p className="m-0 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
            A disponibilidade é a informação mais barata de coletar agora e a mais cara de perseguir
            depois, por telefone, com a criança já avaliada.
          </p>
        </div>
      </Card>

      {/* ----------------------------------------------------------- LGPD */}
      <Card as="section">
        <CardHeader title="Consentimento" />
        <div className="space-y-2 px-5 py-5">
          <div className="flex items-baseline gap-2.5">
            <input type="checkbox" id="consentimento" className="h-6 w-6 shrink-0" />
            <label htmlFor="consentimento" className="text-[0.875rem] text-navy">
              O responsável autorizou o contato e o uso dos dados.
            </label>
          </div>
          <p className="m-0 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
            Em lead vindo de planilha da operadora não há checkbox: a base legal registrada é a
            execução do procedimento a pedido do titular. Qual das duas vale fica gravado no lead —
            é o que separa uma base defensável de uma lista comprada.
          </p>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          id="criar-lead"
          variant="primary"
          unavailableReason={creation.allowed ? undefined : creation.reason}
        >
          Criar lead
        </Button>
        {/* "Voltar sem criar" e não "Cancelar": aqui não há nada a desfazer,
            e o repositório reserva a palavra destrutiva para o que destrói. */}
        <Button id="voltar-sem-criar">Voltar sem criar o lead</Button>
      </div>
    </div>,
  );
}

function Field({
  id,
  label,
  value,
  required,
}: {
  id: string;
  label: string;
  value: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[0.8125rem] font-semibold text-navy">
        {label}
        {required && <span className="text-[var(--fg-2)]"> (obrigatório)</span>}
      </label>
      <input
        id={id}
        type="text"
        defaultValue={value}
        className="mt-1 w-full rounded-card border border-[var(--border-soft)] bg-surface px-3 py-2 text-[0.875rem] text-navy"
      />
    </div>
  );
}

function Select({
  id,
  label,
  options,
  value,
}: {
  id: string;
  label: string;
  options: string[];
  value?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[0.8125rem] font-semibold text-navy">
        {label}
      </label>
      <select
        id={id}
        defaultValue={value ?? options[0]}
        className="mt-1 w-full rounded-card border border-[var(--border-soft)] bg-surface px-3 py-2 text-[0.875rem] text-navy"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <LeadShell
      context={context}
      title="Novo lead"
      subtitle="Registrar quem acabou de procurar a clínica"
      breadcrumb={[{ label: "Leads", path: "/leads" }, { label: "Novo lead" }]}
    >
      {children}
    </LeadShell>
  );
}
