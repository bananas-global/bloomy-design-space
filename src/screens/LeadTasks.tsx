import type { ScreenProps } from "@brucesantos/design-space";
import type { LeadsData } from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { LeadShell, ProposalBanner, StepChip } from "../components/LeadParts.js";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
} from "../components/primitives.js";
import { bucketTasks, tasksIn, type BucketedTask } from "../rules/leads.js";

/**
 * Minhas tarefas.
 *
 * A pergunta da manhã não é “como está o funil”: é “quem eu ligo agora”. O
 * quadro responde a primeira e obriga a percorrer nove colunas para responder a
 * segunda.
 *
 * Concluir uma tarefa oferece registrar o que aconteceu na sequência. Sem isso,
 * o efeito de marcar o checkbox é a linha sumir — e a conversa que justificou a
 * conclusão não fica em lugar nenhum, que é exatamente como uma timeline morre.
 */
export function LeadTasks({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as tarefas" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const leadsData = data as LeadsData | null;
  if (!leadsData) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const items = bucketTasks(leadsData);
  const atrasadas = tasksIn(items, "overdue");
  const hoje = tasksIn(items, "today");
  const proximas = tasksIn(items, "upcoming");

  if (items.length === 0) {
    return wrap(
      context,
      <div className="space-y-4">
        <ProposalBanner />
        <EmptyState
          title="Nenhuma tarefa aberta"
          description="A fila vazia é boa notícia só quando o funil também está vazio. Se há leads ativos sem tarefa, eles não aparecem aqui — aparecem em vermelho no quadro."
        />
      </div>,
    );
  }

  return wrap(
    context,
    <div className="space-y-4">
      <ProposalBanner />

      <Grupo
        title="Atrasadas"
        hint={`${atrasadas.length} venceram e ninguém fechou`}
        items={atrasadas}
        locale={locale}
        emptyLabel="Nada atrasado."
      />
      <Grupo
        title="Hoje"
        hint={`${hoje.length} vencem hoje`}
        items={hoje}
        locale={locale}
        emptyLabel="Nada para hoje."
      />
      <Grupo
        title="Próximas"
        hint={`${proximas.length} nos próximos dias`}
        items={proximas}
        locale={locale}
        emptyLabel="Nada programado."
      />
    </div>,
  );
}

function Grupo({
  title,
  hint,
  items,
  locale,
  emptyLabel,
}: {
  title: string;
  hint: string;
  items: BucketedTask[];
  locale: string | undefined;
  emptyLabel: string;
}) {
  return (
    <Card as="section">
      <CardHeader title={title} hint={hint} />
      <div className="px-5 py-5">
        {items.length === 0 ? (
          <p className="m-0 text-[0.875rem] text-[var(--fg-2)]">{emptyLabel}</p>
        ) : (
          <ul className="m-0 list-none space-y-4 p-0">
            {items.map(({ task, lead, bucket, daysFromNow }) => (
              <li key={task.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={`fila-${task.id}`}
                  className="mt-1 h-6 w-6 shrink-0"
                  aria-label={`Concluir: ${task.title}`}
                />
                <div className="min-w-0">
                  <label
                    htmlFor={`fila-${task.id}`}
                    className="block text-[0.9375rem] font-semibold text-navy"
                  >
                    {task.title}
                  </label>
                  <p className="m-0 mt-0.5 text-[0.875rem] text-navy">
                    <a
                      href={`/leads/${lead.id}`}
                      className="inline-block py-1 font-semibold underline-offset-2 hover:underline"
                    >
                      {lead.contactName}
                    </a>{" "}
                    <StepChip step={lead.step} />
                  </p>
                  <p className="m-0 text-[0.8125rem] text-[var(--fg-2)]">
                    {bucket === "overdue" ? (
                      <span className="font-semibold text-danger-fg">
                        venceu há {Math.abs(daysFromNow)}{" "}
                        {Math.abs(daysFromNow) === 1 ? "dia" : "dias"}
                      </span>
                    ) : bucket === "today" ? (
                      `hoje às ${task.dueAt.slice(11, 16)}`
                    ) : (
                      `${formatDate(task.dueAt, locale)} às ${task.dueAt.slice(11, 16)}`
                    )}
                    {task.assignedTo && ` · ${task.assignedTo}`}
                  </p>
                  <div className="mt-2">
                    {/* Concluir sem registrar o que aconteceu é como a timeline
                        morre: a linha some e a conversa não fica em lugar
                        nenhum. */}
                    <Button id={`registrar-${task.id}`}>Concluir e registrar o que aconteceu</Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <LeadShell
      context={context}
      title="Minhas tarefas"
      subtitle="Atrasadas, de hoje e próximas — com o lead ao lado"
      breadcrumb={[{ label: "Leads", path: "/leads" }, { label: "Tarefas" }]}
    >
      {children}
    </LeadShell>
  );
}
