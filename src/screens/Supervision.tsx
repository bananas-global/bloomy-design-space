import type { ScreenProps } from "@brucesantos/design-space";
import type { SupervisedSchedule, SupervisionData } from "../contracts/index.js";
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
  awaitingProfessional,
  awaitingSupervisor,
  canOpenSupervision,
  daysWaiting,
  defaultPeriod,
  hiddenForHavingNoLinks,
  listedSupervisors,
  looksForward,
  supervisionState,
  supervisionStateLabel,
} from "../rules/supervision.js";

/**
 * Supervisão.
 *
 * A tela se chama Supervisão e a leitura óbvia é que ela serve ao supervisor.
 * Não serve: `list_supervisor` é de admin, admin de clínica e coordenação, e o
 * papel `supervisor` não está lá. É uma visão **sobre** supervisores, para quem
 * coordena.
 *
 * Três decisões seguem daí:
 *
 * 1. **O estado da supervisão é a primeira coluna.** A tabela real lista
 *    serviço, profissional, paciente, sala, horário e situação — tudo menos se
 *    a assinatura está pendente, que é o único efeito mecânico do vínculo em
 *    todo o sistema. Sem essa coluna, quem coordena descobre a pendência pelo
 *    atraso.
 *
 * 2. **O período diz para que lado está olhando.** O padrão abre 30 dias para
 *    trás. É legítimo para conferir e inútil para acompanhar, e a tela precisa
 *    dizer qual das duas coisas está fazendo.
 *
 * 3. **Quem não abre a tela é mandado para onde funciona.** Um "sem permissão"
 *    seco deixaria o supervisor procurando. Ele acompanha os casos dele pelo
 *    atendimento, onde a assinatura é pedida — e é isso que a tela diz.
 */
export function Supervision({ context }: ScreenProps) {
  const { data, isLoading, error, locale, permissions, persona } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a supervisão" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const supervision = data as SupervisionData | null;
  if (!supervision) return wrap(context, <ErrorState message="Não foi possível carregar." />);

  const access = canOpenSupervision(permissions, persona?.id ?? "");
  if (!access.allowed) {
    return wrap(
      context,
      <EmptyState title="Esta tela é da coordenação" description={access.reason!} />,
    );
  }

  const visible = listedSupervisors(supervision.supervisors);
  const hidden = hiddenForHavingNoLinks(supervision.supervisors);
  const selected = visible.find((item) => item.id === supervision.selectedSupervisorId);
  const parados = awaitingSupervisor(supervision);
  const comProfissional = awaitingProfessional(supervision);
  const padrao = defaultPeriod();
  const noPadrao =
    supervision.period.start === padrao.start && supervision.period.end === padrao.end;

  return wrap(
    context,
    <div className="space-y-4">
      {/* ------------------------------------------------------- período */}
      <Card as="section">
        <CardHeader
          title="Período"
          hint={`${formatDate(`${supervision.period.start}T12:00:00.000-03:00`, locale)} a ${formatDate(`${supervision.period.end}T12:00:00.000-03:00`, locale)}`}
        />
        <div className="px-5 py-5">
          {/* A tela diz para que lado está olhando, porque conferir e
              acompanhar pedem janelas opostas. */}
          <p className="m-0 max-w-[68ch] text-[0.9375rem] text-navy">
            {looksForward(supervision.period)
              ? "Este período alcança o que ainda vai acontecer — é a janela de acompanhar, em que dá para decidir onde estar."
              : "Este período olha só para trás — é a janela de conferir o que já aconteceu."}
          </p>
          {noPadrao && (
            <p className="m-0 mt-2 max-w-[68ch] text-[0.8125rem] text-[var(--fg-2)]">
              É o padrão do sistema: 30 dias para trás, terminando hoje. Ninguém abre a tela assim
              para decidir onde estar amanhã — e é aí que a supervisão muda o resultado.
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* -------------------------------------------------- supervisores */}
        <Card as="section">
          <CardHeader title="Supervisores" hint={`${visible.length} com vínculo`} />
          <div className="px-5 py-5">
            <ul className="m-0 list-none space-y-2 p-0">
              {visible.map((supervisor) => (
                <li
                  key={supervisor.id}
                  className={`rounded-field border px-4 py-3 ${
                    supervisor.id === supervision.selectedSupervisorId
                      ? "border-[var(--border-strong)] bg-ink-50"
                      : "border-[var(--border-soft)]"
                  }`}
                >
                  <p className="m-0 text-[0.9375rem] font-semibold text-navy">
                    {supervisor.name}
                    {/* Selecionado dito em palavra: a borda e o fundo sozinhos
                        deixam a relação com o painel da direita por inferir. */}
                    {supervisor.id === supervision.selectedSupervisorId && (
                      <span className="ml-2 text-[0.8125rem] font-normal text-[var(--fg-2)]">
                        · em exibição ao lado
                      </span>
                    )}
                  </p>
                  <p className="m-0 text-[0.8125rem] text-[var(--fg-2)]">
                    {supervisor.specialtyName} · {supervisor.internCount}{" "}
                    {supervisor.internCount === 1 ? "supervisionado" : "supervisionados"}
                  </p>
                </li>
              ))}
            </ul>

            {/* Derivar do vínculo é mais honesto que derivar do papel. O efeito
                colateral precisa ser dito, não corrigido em silêncio. */}
            {hidden.length > 0 && (
              <div className="mt-4">
                <Notice tone="info" title="Quem não aparece nesta lista" level={3}>
                  <p className="m-0">
                    {hidden.map((supervisor) => supervisor.name).join(", ")}{" "}
                    {hidden.length === 1 ? "tem o papel de supervisor e nenhum vínculo" : "têm o papel de supervisor e nenhum vínculo"}.
                    A lista é montada a partir dos vínculos, e não do papel.
                  </p>
                  <p className="m-0 mt-2">
                    É a escolha certa — supervisão é uma relação, não um cargo. O preço é que quem
                    acabou de ser designado fica invisível exatamente quando alguém precisaria
                    encontrá-{hidden.length === 1 ? "lo" : "los"} para atribuir o primeiro caso.
                  </p>
                </Notice>
              </div>
            )}
          </div>
        </Card>

        {/* --------------------------------------------------- atendimentos */}
        <Card as="section">
          <CardHeader
            title="Atendimentos dos supervisionados"
            hint={selected ? selected.name : undefined}
          />
          <div className="space-y-4 px-5 py-5">
            {parados.length > 0 && (
              <Notice
                tone="warn"
                title={`${parados.length} ${parados.length === 1 ? "atendimento parado" : "atendimentos parados"} esperando a assinatura do supervisor`}
                level={3}
              >
                <p className="m-0">
                  A segunda assinatura é o único efeito mecânico do vínculo de supervisão em todo o
                  sistema. Na tela atual ela não aparece aqui — a pendência só se vê atendimento a
                  atendimento, e quem coordena descobre pelo atraso.
                </p>
              </Notice>
            )}

            {comProfissional.length > 0 && (
              <Notice
                tone="pending"
                title={`${comProfissional.length} ${comProfissional.length === 1 ? "espera" : "esperam"} quem atendeu assinar`}
                level={3}
              >
                A cobrança destes tem outro destinatário: a assinatura do supervisor nem foi pedida
                ainda.
              </Notice>
            )}

            {supervision.schedules.length === 0 ? (
              <EmptyState
                title="Nenhum atendimento no período"
                description="Nada dos supervisionados desta pessoa caiu na janela escolhida. Ampliar o período ou olhar para a frente costuma ser o próximo passo."
              />
            ) : (
              <ul className="m-0 list-none space-y-3 p-0">
                {supervision.schedules.map((schedule) => (
                  <li key={schedule.id}>
                    <ScheduleRow schedule={schedule} locale={locale} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>,
  );
}

function ScheduleRow({
  schedule,
  locale,
}: {
  schedule: SupervisedSchedule;
  locale: string | undefined;
}) {
  const state = supervisionState(schedule);
  const waiting = state === "awaiting-supervisor" ? daysWaiting(schedule) : undefined;

  return (
    <article
      className={`rounded-field border px-4 py-3 ${
        state === "awaiting-supervisor"
          ? "border-warn-fg/35 bg-warn-bg"
          : "border-[var(--border-soft)]"
      }`}
    >
      {/* O estado da supervisão vem primeiro: é a coluna que falta na tela
          real, e é a única razão de esta lista existir. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Chip
          tone={
            state === "awaiting-supervisor"
              ? "warn"
              : state === "signed"
                ? "ok"
                : state === "awaiting-professional"
                  ? "pending"
                  : "neutral"
          }
        >
          {supervisionStateLabel(state)}
        </Chip>
        {waiting !== undefined && (
          <span className="text-[0.8125rem] font-semibold text-warn-fg">
            há {waiting} {waiting === 1 ? "dia" : "dias"}
          </span>
        )}
      </div>

      <p className="m-0 mt-1.5 text-[0.9375rem] font-semibold text-navy">
        {schedule.professionalName} · {schedule.patientName}
      </p>
      <p className="m-0 text-[0.875rem] text-navy">
        {schedule.specialtyName} · {schedule.serviceName}
      </p>
      <p className="m-0 mt-0.5 text-[0.8125rem] text-[var(--fg-2)]">
        {formatDate(schedule.start, locale)}, {formatTime(schedule.start, locale)} às{" "}
        {formatTime(schedule.end, locale)}
        {schedule.roomName && <> · {schedule.roomName}</>}
      </p>

      {schedule.signedByProfessionalAt && (
        <p className="m-0 mt-1 text-[0.8125rem] text-[var(--fg-2)]">
          {schedule.professionalName} assinou em{" "}
          {formatDate(schedule.signedByProfessionalAt, locale)} às{" "}
          {formatTime(schedule.signedByProfessionalAt, locale)}
        </p>
      )}
    </article>
  );
}

function wrap(context: ScreenProps["context"], children: React.ReactNode) {
  return (
    <AppShell
      context={context}
      title="Supervisão"
      subtitle="Uma visão da coordenação sobre quem supervisiona quem"
      breadcrumb={[{ label: "Supervisão" }]}
    >
      {children}
    </AppShell>
  );
}
