import type { ScreenProps } from "@brucesantos/design-space";
import type { Prospect, ProspectsData } from "../contracts/index.js";
import { formatDate } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
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
  CONVERSION_EXTRA_FIELDS,
  FUNNEL_LINE,
  canConvert,
  canScheduleFirstSession,
  daysInCurrentStep,
  isSideExit,
  lossesByStep,
  sourceLabel,
  stalled,
  stepLabel,
  stepPosition,
  weekdayName,
} from "../rules/prospects.js";

/**
 * Visitas.
 *
 * O único lugar do produto em que alguém ainda **não é paciente** — e por isso
 * o único em que quase nada é obrigatório. Três decisões seguem daí:
 *
 * 1. **Perdido é saída lateral, não último estágio.** Desenhado em linha, o
 *    funil sugere que todo mundo caminha até o fim antes de desistir, e esconde
 *    onde as pessoas param — que é a única coisa que ler o funil serve para
 *    descobrir. A tela agrupa as perdas pelo passo em que aconteceram.
 *
 * 2. **A conversão pede o que a visita não coleta.** Cinco campos, sempre os
 *    mesmos. Dizer isso antes evita descobrir com a família na frente.
 *
 * 3. **Tempo parado aparece junto do passo.** Numa lista por estágio, quem está
 *    há dois meses é idêntico a quem chegou ontem.
 */
export function Prospects({ context }: ScreenProps) {
  const { data, isLoading, error, locale, permissions } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando as visitas" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const prospectsData = data as ProspectsData | null;
  if (!prospectsData) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const { prospects } = prospectsData;

  if (prospects.length === 0) {
    return wrap(
      context,
      <EmptyState
        title="Nenhuma visita registrada"
        description="Aqui ficam as famílias que procuraram a clínica e ainda não viraram paciente — com o passo em que estão, a disponibilidade que declararam e o histórico de contato."
      />,
      prospectsData,
    );
  }

  const losses = lossesByStep(prospectsData);
  const parados = stalled(prospectsData);
  const emLinha = prospects.filter((item) => !isSideExit(item.step));
  const perdidos = prospects.filter((item) => isSideExit(item.step));

  return wrap(
    context,
    <div className="space-y-4">
      {parados.length > 0 && (
        <Notice
          tone="warn"
          title={`${parados.length} ${parados.length === 1 ? "contato parado" : "contatos parados"} há mais de 30 dias`}
        >
          {parados.map((item) => item.childName).join(", ")}. Numa lista por estágio, quem está há
          dois meses é idêntico a quem chegou ontem — por isso o tempo aparece junto do passo.
        </Notice>
      )}

      {/* --------------------------------------------- onde se perde gente */}
      {losses.length > 0 && (
        <Card as="section">
          <CardHeader
            title="Onde o funil perde gente"
            hint="Perdido não é o último passo: é saída de qualquer passo"
          />
          <div className="px-5 py-5">
            <ul className="m-0 list-none space-y-2 p-0">
              {losses.map((loss) => (
                <li key={loss.step} className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-[15px] font-semibold text-navy">
                    {loss.count} {loss.count === 1 ? "perdido" : "perdidos"}
                  </span>
                  <span className="text-[15px] text-navy">em {stepLabel(loss.step)}</span>
                </li>
              ))}
            </ul>
            <p className="m-0 mt-3 max-w-[68ch] text-[13px] text-[var(--fg-2)]">
              Agrupar as perdas pelo passo em que aconteceram é o que um funil de oito estágios em
              linha esconde — e é a única leitura que diz onde o processo perde gente.
            </p>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------- em linha */}
      <Card as="section">
        <CardHeader title="No funil" hint={`${emLinha.length} contatos ativos`} />
        <div className="space-y-3 px-5 py-5">
          {emLinha.map((prospect) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              now={prospectsData.now}
              locale={locale}
              permissions={permissions}
            />
          ))}
        </div>
      </Card>

      {/* -------------------------------------------------------- perdidos */}
      {perdidos.length > 0 && (
        <Card as="section">
          <CardHeader title="Perdidos" hint="Continuam registrados: o motivo é o que ensina" />
          <ul className="m-0 list-none space-y-2 p-5">
            {perdidos.map((prospect) => (
              <li key={prospect.id} className="text-[15px] text-navy">
                <span className="font-semibold">{prospect.childName}</span>{" "}
                <span className="text-[13px] text-[var(--fg-2)]">
                  {prospect.observation ?? "sem motivo registrado"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>,
    prospectsData,
  );
}

function ProspectCard({
  prospect,
  now,
  locale,
  permissions,
}: {
  prospect: Prospect;
  now: string;
  locale: string | undefined;
  permissions: string[];
}) {
  const convert = canConvert(prospect, permissions);
  const scheduling = canScheduleFirstSession(prospect);
  const days = daysInCurrentStep(prospect, now);
  const position = stepPosition(prospect.step);

  return (
    <article className="rounded-card border border-[var(--border-soft)] px-4 py-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="m-0 text-[15px] font-bold text-navy">{prospect.childName}</h3>
        <Chip tone="info">{stepLabel(prospect.step)}</Chip>
        {position !== undefined && (
          <span className="text-[13px] text-[var(--fg-2)]">
            passo {position + 1} de {FUNNEL_LINE.length}
          </span>
        )}
        {/* O tempo parado vem junto do passo, e não numa coluna separada. */}
        {days !== undefined && (
          <span
            className={`text-[13px] ${days >= 30 ? "font-semibold text-warn-fg" : "text-[var(--fg-2)]"}`}
          >
            há {days} {days === 1 ? "dia" : "dias"} neste passo
          </span>
        )}
      </div>

      <p className="m-0 mt-0.5 text-[14px] text-navy">
        {prospect.guardianName}
        {prospect.guardianPhone && ` · ${prospect.guardianPhone}`}
        {" · "}
        <span className="text-[var(--fg-2)]">
          {sourceLabel(prospect.source)} · unidade {prospect.unitOfInterest}
        </span>
      </p>

      {prospect.observation && (
        <p className="m-0 mt-1 max-w-[68ch] text-[13px] text-[var(--fg-2)]">
          {prospect.observation}
        </p>
      )}

      {/* ------------------------------------------------ disponibilidade */}
      <div className="mt-2">
        {prospect.availability.length > 0 ? (
          <p className="m-0 text-[14px] text-navy">
            Disponível{" "}
            {prospect.availability
              .map((slot) => `${weekdayName(slot.weekday)} das ${slot.startAt} às ${slot.endAt}`)
              .join("; ")}
            .
          </p>
        ) : (
          <p className="m-0 text-[14px] font-semibold text-warn-fg">
            Nenhuma janela de disponibilidade declarada.
          </p>
        )}
      </div>

      {prospect.visits.length > 0 && (
        <p className="m-0 mt-1 text-[13px] text-[var(--fg-2)]">
          Visitou em{" "}
          {prospect.visits
            .map((visit) => formatDate(`${visit.date}T12:00:00.000-03:00`, locale))
            .join(", ")}
          .
        </p>
      )}

      {/* ------------------------------------------------------- conversão */}
      {!convert.allowed && convert.reason?.includes("visita não coleta") && (
        <div className="mt-2">
          <Notice tone="info" title="A conversão pede o que a visita não coleta" level={3}>
            <ul className="m-0 list-disc space-y-0.5 pl-5">
              {CONVERSION_EXTRA_FIELDS.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            <p className="m-0 mt-2">
              São sempre os mesmos cinco. Vale coletar na visita, em vez de descobrir com a família
              na frente.
            </p>
          </Notice>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3">
        <Button
          id={`converter-${prospect.id}`}
          variant="primary"
          unavailableReason={convert.allowed ? undefined : convert.reason}
        >
          Converter em paciente
        </Button>
        <Button
          id={`agendar-${prospect.id}`}
          unavailableReason={scheduling.allowed ? undefined : scheduling.reason}
        >
          Marcar primeira sessão
        </Button>
      </div>
    </article>
  );
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  prospectsData?: ProspectsData,
) {
  return (
    <AppShell
      context={context}
      title="Visitas"
      subtitle={
        prospectsData && prospectsData.prospects.length > 0
          ? "Famílias que ainda não são pacientes"
          : undefined
      }
      breadcrumb={[{ label: "Visitas" }]}
    >
      {children}
    </AppShell>
  );
}
