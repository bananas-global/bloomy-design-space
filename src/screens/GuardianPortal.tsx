import type { ScreenProps } from "@brucesantos/design-space";
import type { GuardianPlan, GuardianPortalData } from "../contracts/index.js";
import { formatDate, formatDateTime, formatTime } from "../contracts/index.js";
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
  canAcceptPlan,
  hasAcceptedTerms,
  isExpired,
  plansAwaitingAcceptance,
  upcomingSchedules,
} from "../rules/guardianPortal.js";

/**
 * Portal do responsável legal.
 *
 * A família vê o combinado, não o registro clínico. Não há tentativa, evolução
 * nem prontuário aqui — e essa ausência é uma decisão, não uma lacuna do porte.
 *
 * O que existe e não existe em nenhuma outra tela é o **consentimento**: a
 * família aceita o plano terapêutico do filho, assinando com o próprio nome.
 * Três decisões seguem daí:
 *
 * 1. **O plano é mostrado por inteiro antes do aceite.** Metas e objetivos em
 *    linguagem da família, não códigos de programa. Consentir com um resumo não
 *    é consentir.
 *
 * 2. **A assinatura é um campo, não uma caixa de seleção.** Digitar o próprio
 *    nome é um ato; marcar uma caixa é um reflexo.
 *
 * 3. **Horário cancelado continua na lista, marcado.** Sumir com ele faria a
 *    família descobrir o cancelamento chegando na clínica.
 */
export function GuardianPortal({ context }: ScreenProps) {
  const { data, isLoading, error, locale } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  const portal = data as GuardianPortalData | null;
  if (!portal) return wrap(context, <ErrorState message="Não foi possível abrir o portal." />);

  const awaiting = plansAwaitingAcceptance(portal);
  const schedules = upcomingSchedules(portal);

  return wrap(
    context,
    <div className="mx-auto max-w-[46rem] space-y-5">
      {!hasAcceptedTerms(portal) && (
        <Notice tone="pending" title="Aceite os termos de uso para continuar">
          É o primeiro acesso. Guardamos o instante, o endereço de rede e o aparelho usado — não
          para acompanhar você, mas para que o aceite tenha registro se for questionado depois.
        </Notice>
      )}

      {awaiting.length > 0 && (
        <Notice
          tone="info"
          title={`${awaiting.length === 1 ? "Um plano espera" : `${awaiting.length} planos esperam`} seu aceite`}
        >
          O plano descreve o que vai ser ensinado e por quanto tempo. Vale ler inteiro antes de
          assinar.
        </Notice>
      )}

      {/* ------------------------------------------------------- agenda */}
      <Card as="section">
        <CardHeader title="Próximos atendimentos" />
        <div className="px-5 py-5">
          {schedules.length === 0 ? (
            <p className="m-0 text-[17px] text-navy">
              Nenhum horário marcado por enquanto. A clínica entra em contato para combinar os
              próximos.
            </p>
          ) : (
            <ul className="m-0 list-none space-y-3 p-0">
              {schedules.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-field border px-4 py-3 ${
                    item.cancelled
                      ? "border-danger-fg/30 bg-danger-bg"
                      : "border-[var(--border-soft)]"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[17px] font-semibold text-navy">
                      {formatDate(item.start, locale)} às {formatTime(item.start, locale)}
                    </span>
                    {item.cancelled && <Chip tone="danger">Cancelado</Chip>}
                  </div>
                  <p className="m-0 mt-0.5 text-[16px] text-navy">
                    {item.patientName} · {item.serviceName}
                  </p>
                  <p className="m-0 text-[14px] text-[var(--fg-2)]">
                    {item.professionalName} · unidade {item.unitName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* -------------------------------------------------------- planos */}
      {portal.plans.length === 0 ? (
        <EmptyState
          title="Nenhum plano montado ainda"
          description="Depois da avaliação inicial, o plano de ensino aparece aqui para você ler e aceitar."
        />
      ) : (
        portal.plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} portal={portal} locale={locale} />
        ))
      )}

      {/* -------------------------------------------------------- termos */}
      {portal.termsAcceptance && (
        <Card as="section">
          <CardHeader title="Termos de uso" hint="Registro do seu aceite" />
          <div className="px-5 py-5">
            <p className="m-0 text-[15px] text-navy">
              Aceitos em {formatDateTime(portal.termsAcceptance.acceptedAt, locale)}, de{" "}
              {portal.termsAcceptance.device}, pelo endereço {portal.termsAcceptance.ipAddress}.
            </p>
            <p className="m-0 mt-1.5 max-w-[52ch] text-[13px] text-[var(--fg-2)]">
              Guardamos esses três dados para que o aceite tenha registro se for questionado — não
              para acompanhar sua navegação.
            </p>
          </div>
        </Card>
      )}
    </div>,
    portal,
  );
}

function PlanCard({
  plan,
  portal,
  locale,
}: {
  plan: GuardianPlan;
  portal: GuardianPortalData;
  locale: string | undefined;
}) {
  const decision = canAcceptPlan(plan, portal);
  const expired = isExpired(plan, portal.now);
  const isOwn = portal.patients.some((patient) => patient.id === plan.patient.id);

  // Plano de outra família não mostra conteúdo nenhum: a negativa vem antes de
  // qualquer informação sobre a criança.
  if (!isOwn) {
    return (
      <Card as="section">
        <div className="px-5 py-6">
          <Notice tone="warn" title="Este plano não é seu" level={2}>
            {decision.reason} Se você acha que deveria ver este plano, fale com a coordenação da
            unidade.
          </Notice>
        </div>
      </Card>
    );
  }

  return (
    <Card as="section">
      <CardHeader
        title={plan.name}
        hint={`${plan.patient.name} · de ${formatDate(plan.startAt + "T12:00:00.000-03:00", locale)} a ${formatDate(plan.endAt + "T12:00:00.000-03:00", locale)}`}
      />
      <div className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          {plan.guardianApproved ? (
            <Chip tone="ok">Aceito por você</Chip>
          ) : expired ? (
            <Chip tone="neutral">Vencido</Chip>
          ) : (
            <Chip tone="pending">Esperando seu aceite</Chip>
          )}
        </div>

        {plan.observation && (
          <p className="m-0 max-w-[52ch] text-[16px] text-navy">{plan.observation}</p>
        )}

        {/* O plano por inteiro, antes do aceite. Consentir com resumo não é
            consentir — e "meta" e "objetivo" são as palavras que a família ouve
            na devolutiva. */}
        <div>
          <h3 className="m-0 text-[16px] font-bold text-navy">O que vai ser trabalhado</h3>
          <ul className="m-0 mt-2 list-none space-y-3 p-0">
            {plan.goals.map((goal) => (
              <li key={goal.id}>
                <p className="m-0 text-[16px] font-semibold text-navy">{goal.name}</p>
                <ul className="m-0 mt-1 list-disc space-y-0.5 pl-5 text-[15px] text-navy">
                  {goal.objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        {plan.guardianApproved ? (
          <div className="rounded-field bg-ok-bg px-4 py-3">
            <p className="m-0 text-[15px] text-ok-fg">
              <span className="font-semibold">Assinado por {plan.signature}</span>
              {plan.signedAt && ` em ${formatDate(plan.signedAt + "T12:00:00.000-03:00", locale)}`}.
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor={`assinatura-${plan.id}`} className="block text-[16px] font-semibold text-navy">
              Assine com seu nome completo
            </label>
            {/* Campo, e não caixa de seleção: digitar o próprio nome é um ato;
                marcar uma caixa é um reflexo. */}
            <input
              id={`assinatura-${plan.id}`}
              type="text"
              autoComplete="name"
              disabled={!decision.allowed}
              placeholder={portal.guardian.name}
              className="mt-2 w-full max-w-[26rem] rounded-field border border-[var(--border-strong)] bg-surface px-4 py-3 text-[17px] text-navy disabled:cursor-not-allowed disabled:opacity-55"
            />
            <div className="mt-3">
              <Button
                id={`aceitar-${plan.id}`}
                variant="primary"
                className="px-6 py-3 text-[17px]"
                unavailableReason={decision.allowed ? undefined : decision.reason}
              >
                Aceitar o plano
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  portal?: GuardianPortalData,
) {
  return (
    <AppShell
      context={context}
      title="Bloomy"
      subtitle={portal ? `Olá, ${portal.guardian.name.split(" ")[0]}` : undefined}
      surface="standalone"
    >
      {children}
    </AppShell>
  );
}
