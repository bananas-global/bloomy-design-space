import type { ScreenProps } from "@brucesantos/design-space";
import type { OverdueData, OverdueSchedule } from "../contracts/index.js";
import { formatDate, formatTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Card,
  CardHeader,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
} from "../components/primitives.js";
import {
  hiddenFromCoordinator,
  hoursOpen,
  verdict,
  visibleTo,
  whereTheDefinitionsDisagree,
} from "../rules/overdue.js";

/**
 * Atendimentos em atraso.
 *
 * `ScheduleFilters` define "pendente ou atrasado" **três vezes**, com respostas
 * diferentes: `pending` sem janela nenhuma, `overdued` com 48 horas, e
 * `overdued_for_coordinator` imediato e sem a etapa do supervisor.
 *
 * Duas pessoas olhando "atrasados" no mesmo sistema veem listas diferentes, e
 * nenhuma sabe que existe outra definição. Três decisões seguem daí:
 *
 * 1. **A tela diz qual definição está usando.** É a correção mais barata
 *    possível e a que faltava: as duas contas são defensáveis isoladamente, e o
 *    que não se sustenta é chamar as duas de "atrasado" em silêncio.
 *
 * 2. **A faixa de divergência aparece separada.** Enquanto as definições
 *    concordam, a ambiguidade não custa nada. O que interessa é o intervalo
 *    entre zero e 48 horas, onde uma lista mostra e a outra não.
 *
 * 3. **O ponto cego é nomeado.** A etapa que espera assinatura de supervisor
 *    some da lista da coordenação — e a tela de Supervisão também não a mostra.
 *    Some das duas, e é a única que some.
 */
export function Overdue({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Procurando atendimentos em atraso" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const overdue = data as OverdueData | null;
  if (!overdue) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const daCoordenacao = overdue.viewerRole === "coordinator";
  const lista = visibleTo(overdue);
  const divergem = whereTheDefinitionsDisagree(overdue);
  const cego = hiddenFromCoordinator(overdue);

  return wrap(
    context,
    <div className="space-y-4">
      {/* A correção mais barata: dizer qual conta está em vigor. */}
      <Notice tone="info" title={daCoordenacao ? "Definição da coordenação" : "Definição geral"}>
        {daCoordenacao ? (
          <p className="m-0">
            Para a coordenação, um atendimento está atrasado assim que passa do horário — e a etapa
            que espera assinatura de supervisor não entra nesta lista.
          </p>
        ) : (
          <p className="m-0">
            Fora da coordenação, um atendimento só é considerado atrasado depois de 48 horas. A
            folga existe para não acusar o que ainda está sendo escrito.
          </p>
        )}
        <p className="m-0 mt-2">
          São duas contas diferentes atrás da mesma palavra. Cada uma se defende sozinha; o que não
          se defende é não dizer qual está em vigor.
        </p>
      </Notice>

      {divergem.length > 0 && (
        <Notice
          tone="warn"
          title={`${divergem.length} ${divergem.length === 1 ? "atendimento aparece" : "atendimentos aparecem"} numa lista e não na outra`}
        >
          <ul className="m-0 list-disc space-y-1 pl-5">
            {divergem.map((entry) => (
              <li key={entry.id}>
                {entry.patientName}, {formatDate(entry.start, locale)} às{" "}
                {formatTime(entry.start, locale)} — aberto há {hoursOpen(entry, overdue.now)} horas,
                dentro da folga de 48.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            É nesta faixa que a ambiguidade custa: a coordenação já está cobrando e o relatório de
            pendências ainda não os conta.
          </p>
        </Notice>
      )}

      {/* O ponto cego, dito onde ele acontece. */}
      {daCoordenacao && cego.length > 0 && (
        <Notice tone="danger" title="A etapa do supervisor não entra em lista nenhuma">
          <ul className="m-0 list-disc space-y-1 pl-5">
            {cego.map((entry) => (
              <li key={entry.id}>
                {entry.patientName} com {entry.professionalName} — parado há{" "}
                {hoursOpen(entry, overdue.now)} horas esperando o supervisor.
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2">
            A lista de atraso da coordenação exclui esta etapa, o que é coerente — não é ela quem
            assina. Mas a tela de Supervisão também não a mostra. É a única que some das duas.
          </p>
        </Notice>
      )}

      <Card as="section">
        <CardHeader
          title={daCoordenacao ? "Atrasados para a coordenação" : "Atrasados há mais de 48 horas"}
          hint={`${lista.length} ${lista.length === 1 ? "atendimento" : "atendimentos"}`}
        />
        <div className="px-5 py-5">
          {lista.length === 0 ? (
            <EmptyState
              title="Nada em atraso por esta definição"
              description="Vale lembrar que a outra definição pode ter itens — é justamente essa diferença que esta tela existe para tornar visível."
            />
          ) : (
            <ul className="m-0 list-none space-y-3 p-0">
              {lista.map((entry) => (
                <li key={entry.id}>
                  <Row entry={entry} now={overdue.now} locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>,
  );
}

function Row({
  entry,
  now,
  locale,
}: {
  entry: OverdueSchedule;
  now: string;
  locale: string | undefined;
}) {
  const v = verdict(entry, now);
  const horas = hoursOpen(entry, now);

  return (
    <article className="rounded-field border border-[var(--border-soft)] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-semibold text-navy">{entry.patientName}</span>
        <span className="text-[0.875rem] text-navy">{entry.professionalName}</span>
        <span className={`text-[0.8125rem] ${horas > 48 ? "font-semibold text-warn-fg" : "text-[var(--fg-2)]"}`}>
          aberto há {horas} horas
        </span>
        {/* As duas contas, lado a lado: é a comparação que informa. */}
        <Chip tone={v.paraCoordenacao ? "warn" : "neutral"}>
          {v.paraCoordenacao ? "atrasado para a coordenação" : "no prazo da coordenação"}
        </Chip>
        <Chip tone={v.paraOResto ? "warn" : "neutral"}>
          {v.paraOResto ? "atrasado pela conta geral" : "dentro da folga de 48h"}
        </Chip>
      </div>
      <p className="m-0 mt-1 text-[0.8125rem] text-[var(--fg-2)]">
        {entry.serviceName} · {formatDate(entry.start, locale)} às {formatTime(entry.start, locale)}
      </p>
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Atendimentos em atraso"
      subtitle="E qual das duas definições você está vendo"
      breadcrumb={[{ label: "Agenda", path: "/agenda" }, { label: "Atrasados" }]}
    >
      {children}
    </AppShell>
  );
}
