import type { Rule } from "@brucesantos/design-space";
import type { ClinicalSession, ClinicalSessionData, ScheduleStatus } from "../contracts/index.js";

/**
 * Regras do atendimento clínico.
 *
 * Traduzidas de quatro módulos do monólito, e não de uma leitura de tela:
 * `CustomServices.Create` (as guardas de início), `CustomServices.Finish` (o que
 * vem depois de finalizar), `CustomServices.SignCustomService` (a cadeia de
 * assinatura) e `CustomServices.RevertCustomService` (quando dá para desfazer).
 *
 * O agendamento passa por até seis situações depois de marcado, e cinco delas
 * são "alguém ainda precisa fazer algo". Um desenho que trate isso como
 * realizado/não realizado torna invisível justamente o trabalho pendente — que é
 * o que a coordenação precisa enxergar para fechar o mês.
 */
export const sessionRules: Rule[] = [
  {
    id: "session-requires-checkin",
    statement:
      "Atendimento de paciente em serviço cobrável só começa depois do check-in: o agendamento precisa estar pronto, não iniciado ou atrasado.",
    rationale:
      "O check-in é o que prova presença para o convênio. Sem ele o atendimento acontece e a clínica descobre no faturamento que não pode cobrar. Serviço não cobrável e atendimento de profissional dispensam a exigência, porque não há o que faturar.",
    source: "src/rules/session.ts",
  },
  {
    id: "one-open-session-per-professional",
    statement:
      "Um profissional não pode ter dois atendimentos em aberto ao mesmo tempo. Iniciar o segundo fica bloqueado até o primeiro ser finalizado.",
    rationale:
      "Atendimento aberto é atendimento sendo registrado. Dois abertos significam tentativas caindo no paciente errado, e o dado clínico é o que menos se recupera depois.",
    source: "src/rules/session.ts",
  },
  {
    id: "empty-register-blocks-signature",
    statement:
      "Finalizar sem escrever a evolução leva o atendimento para pendente de registro, não para assinatura.",
    rationale:
      "Assinar é declarar que o registro está correto. Deixar assinar um registro vazio transforma a assinatura em formalidade — e é a assinatura que responde por prontuário.",
    source: "src/rules/session.ts",
  },
  {
    id: "owner-signs-before-supervisor",
    statement:
      "O responsável pelo atendimento assina primeiro. Só depois, e só quando o atendimento exige, o supervisor do responsável assina.",
    rationale:
      "A ordem é o que dá sentido à supervisão: o supervisor confirma um registro que já foi assinado por quem atendeu. Invertida, ele endossaria algo que ainda pode mudar.",
    source: "src/rules/session.ts",
  },
  {
    id: "revert-requires-clean-session",
    statement:
      "Reverter um atendimento só é possível enquanto nada clínico foi registrado nele: nenhuma tentativa de programa, nenhuma resposta de protocolo.",
    rationale:
      "Reverter apaga o atendimento. Com tentativa registrada, apagar destrói dado de evolução que ninguém consegue reconstruir de memória. O erro de quem abriu no paciente errado custa menos que o dado perdido.",
    source: "src/rules/session.ts",
  },
  {
    id: "revert-requires-permission",
    statement: "Só perfis com `custom_services.revert` revertem um atendimento: admin e coordenador.",
    rationale:
      "Quem atende não desfaz o próprio atendimento. A reversão é decisão de coordenação porque apaga registro clínico.",
    source: "src/rules/session.ts",
  },
];

type Decision = { allowed: boolean; reason?: string };

/* ============================================================== início */

/**
 * Implementação das guardas de `CustomServices.Create`.
 *
 * A ordem das verificações é a do monólito, e ela importa: o bloqueio por
 * atendimento aberto vem antes do bloqueio por check-in. Trocar a ordem faria a
 * tela dizer "falta check-in" para quem já fez o check-in e só esqueceu de
 * fechar o atendimento anterior — mandando a pessoa resolver o problema errado.
 */
export function canStartSession(data: ClinicalSessionData, permissions: string[]): Decision {
  const { session, openSessionsForProfessional } = data;

  if (!permissions.includes("custom_services.edit")) {
    return { allowed: false, reason: "Seu perfil não registra atendimento." };
  }

  const open = openSessionsForProfessional[0];
  if (open) {
    return {
      allowed: false,
      reason: `Profissional já tem um atendimento em aberto: ${open.patientName}, das ${open.start.slice(11, 16)}. Finalize antes de começar outro.`,
    };
  }

  if (session.status !== "scheduled" && !READY_TO_START.includes(session.status)) {
    return { allowed: false, reason: "Já existe atendimento com esse agendamento." };
  }

  if (requiresCheckin(session) && !READY_TO_START.includes(session.status)) {
    return {
      allowed: false,
      reason: `${session.patient?.name ?? "O paciente"} ainda não fez check-in na unidade.`,
    };
  }

  return { allowed: true };
}

/**
 * As três situações em que o monólito aceita iniciar sem reclamar de check-in.
 *
 * `not_started` e `delayed` estão aqui porque o check-in já aconteceu e o
 * horário é que escorregou — bloquear seria punir a clínica pelo atraso.
 */
const READY_TO_START: ScheduleStatus[] = ["ready_for_service", "not_started", "delayed"];

/**
 * Implementação de `session-requires-checkin`.
 *
 * Duas saídas dispensam o check-in, e as duas têm a mesma razão: não há o que
 * faturar. Atendimento de profissional — supervisão, reunião clínica, discussão
 * de caso — não tem paciente presente; serviço não cobrável não vira guia.
 */
export function requiresCheckin(session: ClinicalSession): boolean {
  if (session.scheduleType !== "patient") return false;
  return session.service.chargeable;
}

/* ============================================================ finalizar */

/**
 * Implementação de `empty-register-blocks-signature`, espelhando
 * `CustomServices.Finish.new_schedule_status/1`.
 *
 * Vale notar a armadilha de nome no monólito: a função que decide isso se chama
 * `valid_register?/1` e retorna `true` quando o texto está **vazio**. O
 * comportamento está certo e o nome diz o contrário — motivo suficiente para a
 * regra ser escrita aqui pelo efeito, não pela chamada.
 */
export function statusAfterFinish(session: ClinicalSession): ScheduleStatus {
  if (session.scheduleType === "professional") return "finished";
  return isRegisterEmpty(session) ? "pending_register" : "pending_signature";
}

export function isRegisterEmpty(session: ClinicalSession): boolean {
  return stripTags(session.register).trim() === "";
}

/** O monólito passa o registro por `HtmlSanitizeEx.strip_tags/1` antes de medir. */
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/* ============================================================ assinatura */

/**
 * Implementação de `owner-signs-before-supervisor`, espelhando
 * `SignCustomService.validate_professional_signature/3`.
 *
 * `professionalId` é quem está tentando assinar. A regra é sobre identidade, não
 * sobre papel: ter permissão de assinar não basta, é preciso ser a pessoa certa
 * naquele momento da cadeia.
 */
export function canSign(session: ClinicalSession, professionalId: string): Decision {
  if (session.scheduleType === "professional") {
    if (session.status !== "pending_signature") {
      return { allowed: false, reason: "O agendamento não possui a assinatura como pendente." };
    }
    const participated = session.professionals.some((item) => item.id === professionalId);
    if (!participated) {
      return {
        allowed: false,
        reason: "Apenas profissionais que participaram podem assinar o atendimento.",
      };
    }
    return { allowed: true };
  }

  if (session.status !== "pending_signature" && session.status !== "pending_supervisor_signature") {
    return { allowed: false, reason: "O agendamento não possui a assinatura como pendente." };
  }

  const owner = session.professionals[0];
  if (session.status === "pending_signature" && professionalId !== owner?.id) {
    return {
      allowed: false,
      reason: `A assinatura deve ser feita primeiro por ${owner?.name ?? "quem conduziu o atendimento"}.`,
    };
  }

  if (
    session.status === "pending_supervisor_signature" &&
    professionalId !== session.supervisor?.id
  ) {
    return {
      allowed: false,
      reason: `A assinatura deve ser feita por ${session.supervisor?.name ?? "o supervisor do responsável"}.`,
    };
  }

  return { allowed: true };
}

/** Espelha `SignCustomService.handle_new_status/3`. */
export function statusAfterSign(session: ClinicalSession): ScheduleStatus {
  if (session.scheduleType === "professional") return "finished";
  if (session.status === "pending_signature" && session.needsSupervisorSignature) {
    return "pending_supervisor_signature";
  }
  if (session.status === "pending_signature") return "finished";
  if (session.status === "pending_supervisor_signature") return "finished";
  return session.status;
}

/** Quem falta assinar, para a tela dizer o nome em vez de "aguardando assinatura". */
export function pendingSigner(session: ClinicalSession): { name: string; role: string } | undefined {
  if (session.status === "pending_signature") {
    const owner = session.professionals[0];
    return owner ? { name: owner.name, role: "responsável pelo atendimento" } : undefined;
  }
  if (session.status === "pending_supervisor_signature" && session.supervisor) {
    return { name: session.supervisor.name, role: "supervisor" };
  }
  return undefined;
}

/* ============================================================== reverter */

/**
 * Implementação de `revert-requires-clean-session` e `revert-requires-permission`,
 * espelhando `RevertCustomService.can_revert?/1`.
 *
 * A negativa nomeia o que trava, e não só que travou: quem tentou reverter
 * precisa decidir se corrige o registro ou se chama a coordenação, e "não é
 * possível reverter" não sustenta nenhuma das duas decisões.
 */
export function canRevert(session: ClinicalSession, permissions: string[]): Decision {
  if (!permissions.includes("custom_services.revert")) {
    return {
      allowed: false,
      reason: "Seu perfil não reverte atendimentos. Peça à coordenação.",
    };
  }

  const trials = countTrials(session);
  if (trials > 0) {
    return {
      allowed: false,
      reason: `${trials === 1 ? "Uma tentativa de programa já foi registrada" : `${trials} tentativas de programa já foram registradas`} neste atendimento. Reverter apagaria o registro.`,
    };
  }

  if (session.protocolAnswers > 0) {
    return {
      allowed: false,
      reason: `${session.protocolAnswers === 1 ? "Uma resposta de protocolo já foi registrada" : `${session.protocolAnswers} respostas de protocolo já foram registradas`} neste atendimento. Reverter apagaria o registro.`,
    };
  }

  return { allowed: true };
}

export function countTrials(session: ClinicalSession): number {
  return session.programExecutions.reduce(
    (total, execution) =>
      total + execution.steps.reduce((sum, step) => sum + step.trials.length, 0),
    0,
  );
}

/**
 * Para onde o agendamento volta quando o atendimento é revertido.
 *
 * Espelha `RevertCustomService.new_schedule_status/1`. O caso do paciente olha
 * duas coisas — se o agendamento é de hoje e se há check-in de hoje — porque
 * reverter no dia seguinte não pode devolver o agendamento a "pronto para
 * atendimento": o paciente foi para casa.
 */
export function statusAfterRevert(session: ClinicalSession): ScheduleStatus {
  if (session.scheduleType !== "patient") return "scheduled";

  const isToday = session.start.slice(0, 10) === session.now.slice(0, 10);
  if (!isToday) return "not_started";

  const checkedInToday = session.checkin?.at.slice(0, 10) === session.now.slice(0, 10);
  return checkedInToday ? "ready_for_service" : "scheduled";
}

/* ================================================================ leitura */

/** O que ainda falta acontecer, no vocabulário de quem opera. */
export function pendingWork(session: ClinicalSession): string | undefined {
  switch (session.status) {
    case "ready_for_service":
      return "Paciente na unidade, aguardando o início do atendimento.";
    case "ongoing":
      return "Atendimento em andamento.";
    case "pending_register":
      return "Falta escrever a evolução do atendimento.";
    case "pending_signature":
    case "pending_supervisor_signature": {
      const signer = pendingSigner(session);
      return signer ? `Falta a assinatura de ${signer.name}, ${signer.role}.` : undefined;
    }
    default:
      return undefined;
  }
}
