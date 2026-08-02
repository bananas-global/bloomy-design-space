import { useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  ClinicalSessionData,
  ProgramExecution,
  StepPhase,
  Trial,
} from "../contracts/index.js";
import { formatDateTime, formatTime } from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  DetailList,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  ScheduleStatusChip,
  scheduleStatusLabel,
} from "../components/primitives.js";
import {
  canRevert,
  canSign,
  canStartSession,
  countTrials,
  isRegisterEmpty,
  pendingWork,
  requiresCheckin,
  statusAfterFinish,
  statusAfterRevert,
  statusAfterSign,
} from "../rules/session.js";

/**
 * O atendimento.
 *
 * É a tela onde o Bloomy é mais Bloomy: o que acontece aqui não é "marcar como
 * realizado", é conduzir uma sessão de terapia ABA e deixar registro clínico
 * assinado. Três decisões de desenho merecem estar escritas.
 *
 * 1. **A situação do agendamento é o título da página, não um detalhe.** São
 *    doze estados possíveis e cinco deles significam que alguém ainda precisa
 *    agir. Quem abre este link normalmente abre para descobrir o que falta.
 *
 * 2. **Cada ação bloqueada continua visível, com o motivo.** É a convenção do
 *    modelo, e aqui ela carrega peso extra: as guardas do início — check-in,
 *    atendimento aberto, atendimento duplicado — são exatamente onde a pessoa
 *    fica presa sem entender por quê. O motivo nomeia o obstáculo e, quando dá,
 *    quem resolve.
 *
 * 3. **A ação destrutiva mostra o que destruiria antes de destruir.** Reverter
 *    apaga o atendimento. A tela conta quantas tentativas existem, porque é esse
 *    número que decide se o erro compensa ser desfeito.
 */
export function SessionDetail({ context }: ScreenProps) {
  const { data, isLoading, error, locale, can, permissions } = context;

  // Quem está olhando. O motor entrega a persona, e a cadeia de assinatura
  // pergunta por identidade, não por papel: ter permissão não basta, é preciso
  // ser a pessoa certa naquele ponto da cadeia.
  const [outcome, setOutcome] = useState<string | null>(null);

  if (isLoading) return wrap(context, <LoadingState label="Carregando o atendimento" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("patients.see_clinic_overview")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso ao atendimento"
        description="Seu perfil não alcança a visão clínica do paciente. Fale com quem administra os acessos da unidade."
      />,
    );
  }

  const clinical = data as ClinicalSessionData | null;
  if (!clinical) {
    return wrap(
      context,
      <EmptyState
        title="Atendimento não encontrado"
        description="O agendamento pode ter sido cancelado ou revertido. Volte à agenda do dia para conferir."
      />,
    );
  }

  const { session } = clinical;
  const start = canStartSession(clinical, permissions);
  const revert = canRevert(session, permissions);
  const trials = countTrials(session);
  const pending = pendingWork(session);

  // Quem a cadeia de assinatura espera agora. A tela pergunta pelos dois
  // candidatos — responsável e supervisora — em vez de assumir que quem está
  // logado é um deles, porque a coordenação abre esta tela o tempo todo.
  const owner = session.professionals[0];
  const ownerSignature = owner ? canSign(session, owner.id) : { allowed: false };
  const supervisorSignature = session.supervisor
    ? canSign(session, session.supervisor.id)
    : { allowed: false };

  return wrap(
    context,
    <div className="space-y-4">
      {/* Região viva do resultado das ações. Fica antes do conteúdo para que o
          leitor de tela anuncie o efeito no lugar onde a pessoa está. */}
      <p role="status" aria-live="polite" className="sr-only">
        {outcome ?? ""}
      </p>

      {outcome && (
        <Notice tone="ok" title="Pronto" live>
          {outcome}
        </Notice>
      )}

      {pending && !outcome && (
        <Notice
          tone={session.status === "ongoing" ? "info" : "pending"}
          title={situationTitle(session.status)}
        >
          {pending}
        </Notice>
      )}

      <Card as="section">
        <CardHeader title="Atendimento" hint={`${session.service.name} · ${sessionTypeLabel(session.sessionType)}`} />
        <div className="px-5 py-5">
          <DetailList
            items={[
              { label: "Situação", value: <ScheduleStatusChip status={session.status} /> },
              {
                label: "Paciente",
                value: session.patient?.name ?? (
                  <span className="text-[var(--fg-2)]">
                    sem paciente — atendimento entre profissionais
                  </span>
                ),
              },
              {
                label: "Responsável",
                value: owner ? `${owner.name} · ${owner.specialty}` : "não definido",
              },
              ...(session.professionals.length > 1
                ? [
                    {
                      label: "Também presentes",
                      value: session.professionals
                        .slice(1)
                        .map((item) => item.name)
                        .join(", "),
                    },
                  ]
                : []),
              {
                label: "Horário",
                value: `${formatTime(session.start, locale)} às ${formatTime(session.end, locale)}`,
              },
              { label: "Local", value: locationLabel(session.location) },
              {
                label: "Check-in",
                value: session.checkin ? (
                  formatDateTime(session.checkin.at, locale)
                ) : requiresCheckin(session) ? (
                  <span className="font-semibold text-pending-fg">não registrado</span>
                ) : (
                  <span className="text-[var(--fg-2)]">não exigido neste serviço</span>
                ),
              },
              {
                label: "Faturamento",
                value: session.service.chargeable ? "serviço cobrável" : "não cobrável",
              },
            ]}
          />
        </div>
      </Card>

      {/* ------------------------------------------------------- iniciar */}
      {(session.status === "scheduled" ||
        session.status === "ready_for_service" ||
        session.status === "not_started" ||
        session.status === "delayed") && (
        <Card as="section">
          <CardHeader
            title="Iniciar atendimento"
            hint="Começar registra a sessão e trava o agendamento em andamento"
          />
          <div className="px-5 py-5">
            <Button
              id="iniciar"
              variant="primary"
              unavailableReason={start.allowed ? undefined : start.reason}
              onClick={() => setOutcome("Atendimento iniciado. O agendamento está em sessão.")}
            >
              Iniciar atendimento
            </Button>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------ programas */}
      {session.programExecutions.length > 0 && (
        <Card as="section">
          <CardHeader
            title="Programas da sessão"
            hint={`${trials} ${trials === 1 ? "tentativa registrada" : "tentativas registradas"}`}
          />
          <div className="space-y-5 px-5 py-5">
            {session.programExecutions.map((execution) => (
              <ProgramBlock key={execution.id} execution={execution} />
            ))}
          </div>
        </Card>
      )}

      {/* -------------------------------------------------------- registro */}
      {session.scheduleType !== "professional" && (
        <Card as="section">
          <CardHeader title="Evolução" hint="É o que a assinatura declara correto" />
          <div className="px-5 py-5">
            {isRegisterEmpty(session) ? (
              <Notice tone="pending" title="Evolução ainda não escrita" level={3}>
                Finalizar sem a evolução leva o atendimento para{" "}
                <strong>{scheduleStatusLabel(statusAfterFinish(session))}</strong>, e não para
                assinatura. Assinar é declarar que o registro está correto — não há o que declarar
                sobre um texto vazio.
              </Notice>
            ) : (
              <div
                className="max-w-[68ch] space-y-3 text-[15px] leading-relaxed text-navy [&_p]:m-0"
                // A evolução é texto rico no produto real. A fixture é sintética
                // e escrita à mão neste repositório — não há entrada de usuário
                // atravessando aqui.
                dangerouslySetInnerHTML={{ __html: session.register }}
              />
            )}
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------ assinatura */}
      {session.scheduleType !== "professional" && (
        <Card as="section">
          <CardHeader
            title="Assinatura"
            hint={
              session.needsSupervisorSignature
                ? "Este atendimento exige duas: quem atendeu e o supervisor"
                : "Este atendimento exige apenas a assinatura de quem atendeu"
            }
          />
          <div className="space-y-4 px-5 py-5">
            {session.signatures.length > 0 && (
              <ol className="m-0 list-none space-y-2 p-0">
                {session.signatures.map((signature) => (
                  <li key={signature.professionalId} className="flex flex-wrap items-baseline gap-2">
                    <Chip tone="ok">Assinado</Chip>
                    <span className="text-[15px] font-semibold text-navy">
                      {signature.professionalName}
                    </span>
                    <span className="text-[13px] text-[var(--fg-2)]">
                      {signature.role === "owner" ? "responsável pelo atendimento" : "supervisor"} ·{" "}
                      {formatDateTime(signature.at, locale)}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <div className="flex flex-col items-start gap-3">
              {owner && (
                <Button
                  id="assinar-responsavel"
                  variant="primary"
                  unavailableReason={ownerSignature.allowed ? undefined : ownerSignature.reason}
                  onClick={() =>
                    setOutcome(
                      `Atendimento assinado por ${owner.name}. Situação: ${scheduleStatusLabel(statusAfterSign(session))}.`,
                    )
                  }
                >
                  Assinar como {owner.name}
                </Button>
              )}

              {session.supervisor && session.needsSupervisorSignature && (
                <Button
                  id="assinar-supervisor"
                  unavailableReason={
                    supervisorSignature.allowed ? undefined : supervisorSignature.reason
                  }
                  onClick={() =>
                    setOutcome(
                      `Atendimento assinado por ${session.supervisor!.name}. Situação: Finalizado.`,
                    )
                  }
                >
                  Assinar como {session.supervisor.name}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* -------------------------------------------------------- reverter */}
      {session.status !== "scheduled" && session.status !== "cancelled" && (
        <Card as="section">
          <CardHeader
            title="Reverter atendimento"
            hint="Apaga o atendimento e devolve o agendamento à situação anterior"
          />
          <div className="space-y-3 px-5 py-5">
            <p className="m-0 max-w-[68ch] text-[15px] text-navy">
              Reverter devolve o agendamento para{" "}
              <strong>{scheduleStatusLabel(statusAfterRevert(session))}</strong>
              {session.scheduleType === "patient" && (
                <>
                  {" "}
                  — a situação depende de o agendamento ser de hoje e de haver check-in de hoje, e
                  não de quem reverte
                </>
              )}
              .
            </p>
            <Button
              id="reverter"
              variant="danger"
              unavailableReason={revert.allowed ? undefined : revert.reason}
              onClick={() =>
                setOutcome(
                  `Atendimento revertido. O agendamento voltou para ${scheduleStatusLabel(statusAfterRevert(session))}.`,
                )
              }
            >
              Reverter atendimento
            </Button>
          </div>
        </Card>
      )}
    </div>,
    clinical,
  );
}

/* ================================================================ programa */

function ProgramBlock({ execution }: { execution: ProgramExecution }) {
  const total = execution.steps.reduce((sum, step) => sum + step.trials.length, 0);

  return (
    <section className="rounded-card border border-[var(--border-soft)] px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0 text-[15px] font-bold text-navy">{execution.programName}</h3>
        <Chip tone={execution.programType === "structured" ? "info" : "neutral"}>
          {execution.programType === "structured" ? "Estruturado" : "Incidental"}
        </Chip>
      </div>

      <ul className="m-0 mt-3 list-none space-y-3 p-0">
        {execution.steps.map((step) => (
          <li key={step.id}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[15px] text-navy">{step.name}</span>
              <span className="text-[13px] text-[var(--fg-2)]">{phaseLabel(step.phase)}</span>
              <span className="text-[13px] font-semibold text-navy">
                {step.trials.length} de {step.targetTrials}
              </span>
            </div>
            {step.trials.length > 0 && <TrialRow trials={step.trials} />}
          </li>
        ))}
      </ul>

      {total === 0 && (
        <p className="m-0 mt-3 text-[13px] text-[var(--fg-2)]">
          Nenhuma tentativa registrada ainda.
        </p>
      )}
    </section>
  );
}

/**
 * As tentativas em sequência.
 *
 * A cor distingue acerto de erro, e o rótulo textual carrega a informação
 * sozinho: quem lê por leitor de tela, ou uma captura em preto e branco,
 * precisa distinguir "acerto com ajuda motora" de "erro" sem depender do verde.
 */
function TrialRow({ trials }: { trials: Trial[] }) {
  return (
    <ol className="m-0 mt-1.5 flex list-none flex-wrap gap-1.5 p-0">
      {trials.map((trial, index) => (
        <li key={trial.id}>
          <span
            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-field px-1.5 text-[13px] font-semibold ${
              trial.result === "success" ? "bg-ok-bg text-ok-fg" : "bg-danger-bg text-danger-fg"
            }`}
          >
            <span className="sr-only">
              Tentativa {index + 1}: {trial.result === "success" ? "acerto" : "erro"}
              {trial.prompt ? `, com ajuda ${promptLabel(trial.prompt)}` : ", independente"}.
            </span>
            <span aria-hidden="true">
              {trial.result === "success" ? "✓" : "✗"}
              {trial.prompt ? promptLabel(trial.prompt)[0]!.toUpperCase() : ""}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ================================================================ rótulos */

function situationTitle(status: ClinicalSessionData["session"]["status"]): string {
  switch (status) {
    case "ready_for_service":
      return "Pronto para começar";
    case "ongoing":
      return "Em sessão";
    case "pending_register":
      return "Falta registrar";
    case "pending_signature":
    case "pending_supervisor_signature":
      return "Falta assinar";
    default:
      return scheduleStatusLabel(status);
  }
}

function phaseLabel(phase: StepPhase): string {
  return {
    baseline: "Linha de base",
    intervention: "Intervenção",
    generalization: "Generalização",
    maintenance: "Manutenção",
    acquired: "Adquirido",
  }[phase];
}

function promptLabel(prompt: "verbal" | "motor" | "other"): string {
  return { verbal: "verbal", motor: "motora", other: "outra" }[prompt];
}

function locationLabel(location: "in_clinic" | "school" | "home"): string {
  return { in_clinic: "Na clínica", school: "Na escola", home: "Em casa" }[location];
}

function sessionTypeLabel(type: ClinicalSessionData["session"]["sessionType"]): string {
  return {
    initial: "Inicial",
    feedback: "Devolutiva",
    supervision: "Supervisão",
    case_discussion: "Discussão de Caso",
    pedagogical: "Pedagógica",
    in_person: "Presencial",
    camera_observation: "Observação por Câmera",
    clinical_meeting: "Reunião Clínica",
    data_collection: "Coleta de Dados",
    session_training: "Treino em Sessão",
  }[type];
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  clinical?: ClinicalSessionData | null,
) {
  const session = clinical?.session;
  return (
    <AppShell
      context={context}
      title={session?.patient?.name ?? "Atendimento"}
      subtitle={session ? `${session.service.name}` : undefined}
      // A trilha aponta para a agenda, e não para uma lista de atendimentos: no
      // Bloomy real é da agenda do dia que se chega ao atendimento, e inventar
      // aqui uma listagem que o produto não tem seria descrever outra coisa.
      breadcrumb={[{ label: "Agenda", path: "/agenda" }, { label: "Atendimento" }]}
    >
      {children}
    </AppShell>
  );
}
