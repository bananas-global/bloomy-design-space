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
  inSupervisorQuery,
  onlyBecauseItIsMine,
  openButNotInSupervisorQuery,
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
  const doSupervisor =
    overdue.viewerRole === "supervisor" && overdue.viewerProfessionalName !== undefined;
  const lista = visibleTo(overdue);
  const divergem = whereTheDefinitionsDisagree(overdue);
  const cego = hiddenFromCoordinator(overdue);

  if (doSupervisor) {
    const escopo = { supervisorProfessionalName: overdue.viewerProfessionalName! };
    const minha = overdue.schedules.filter((entry) =>
      inSupervisorQuery(entry, overdue.now, escopo),
    );
    const soPorSerMinha = onlyBecauseItIsMine(overdue, escopo);
    const outroAssunto = openButNotInSupervisorQuery(overdue);

    return wrap(
      context,
      <div className="space-y-4">
        {/* A única vez no sistema em que alguém se cobra antes de cobrar os
            outros. Sem estar nomeada, vira "inconsistência" na primeira leitura
            de quem simplifica. */}
        <Notice tone="info" title="Você se cobra antes de cobrar os outros">
          <p className="m-0">
            Nesta lista, um agendamento seu que passou do horário aparece na hora. Um de colega da
            unidade só aparece depois de 48 horas.
          </p>
          <p className="m-0 mt-2">
            São duas janelas na mesma consulta, e é a única vez que o sistema faz isso. É uma
            escolha boa: quem cobra começa por si.
          </p>
        </Notice>

        {soPorSerMinha.length > 0 && (
          <Notice
            tone="warn"
            title={
              soPorSerMinha.length === 1
                ? "1 agendamento seu aparece por ser seu"
                : `${soPorSerMinha.length} agendamentos seus aparecem por serem seus`
            }
          >
            <ul className="m-0 list-disc space-y-1 pl-5">
              {soPorSerMinha.map((entry) => (
                <li key={entry.id}>
                  {entry.patientName} — {hoursOpen(entry, overdue.now)} horas. Fosse de colega,
                  ainda não estaria aqui.
                </li>
              ))}
            </ul>
          </Notice>
        )}

        {outroAssunto.length > 0 && (
          <Notice tone="info" title="Esta lista não é a de atendimentos pendentes">
            <p className="m-0">
              Aqui estão agendamentos que <span className="font-semibold">não começaram</span>. O
              que já começou e falta fechar — registro, assinatura — é outra lista, com outro dono.
            </p>
            <p className="m-0 mt-2">
              {outroAssunto.length}{" "}
              {outroAssunto.length === 1 ? "atendimento está" : "atendimentos estão"} nessa outra
              situação agora, e não aparecem aqui. Uma não é subconjunto da outra.
            </p>
          </Notice>
        )}

        <Card as="section">
          <CardHeader
            title="Agendamentos que não começaram"
            hint={`${minha.length} ${minha.length === 1 ? "agendamento" : "agendamentos"}`}
          />
          <div className="px-5 py-5">
            {minha.length === 0 ? (
              <EmptyState
                title="Nenhum agendamento parado"
                description="Nem os seus, nem os de colegas da unidade além de 48 horas."
              />
            ) : (
              <ul className="m-0 list-none space-y-3 p-0">
                {minha.map((entry) => (
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

      {/* "Não iniciado" nem sempre quer dizer que ninguém começou: um worker
          devolve a esse estado tudo o que ficou em andamento no dia anterior,
          sem deixar log. */}
      {lista.some((entry) => entry.status === "not_started") && (
        <Notice tone="info" title="“Não iniciado” pode ser uma sessão desfeita" level={3}>
          Todo atendimento que fica em andamento ou pronto no dia anterior volta para “não
          iniciado” na virada, por rotina automática e sem registro. Quem começou uma sessão e foi
          interrompido encontra o agendamento como se nada tivesse acontecido.
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
