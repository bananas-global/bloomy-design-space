import type { Rule } from "@brucesantos/design-space";
import type {
  Authorization,
  AuthorizationPackage,
  AuthorizationStatus,
} from "../contracts/index.js";

/**
 * Regras da autorização TISS.
 *
 * É o que decide se a sessão pode ser marcada — e, depois, se ela pode ser
 * cobrada. Traduzidas de `Authorizations.Availability` e do enum de situação de
 * `Authorizations.Authorization`.
 *
 * O módulo anterior deste repositório modelava isso como "guia" com quatro
 * situações inventadas. O real tem dez, e quatro delas são lidas como recusa
 * quando não são. A diferença entre elas é a diferença entre reenviar, anexar
 * documento, escrever justificativa e desistir.
 */
export const authorizationRules: Rule[] = [
  {
    id: "authorization-availability-needs-all-three",
    statement:
      "Uma autorização só serve para agendar quando está autorizada, a data cai dentro da validade e **todos** os pacotes dela ainda têm saldo.",
    rationale:
      "As três condições são checadas juntas em `Availability`, e a terceira usa `Enum.all?`: um único pacote esgotado torna a autorização inteira indisponível, mesmo que os outros tenham saldo. Quem marca precisa saber qual das três falhou.",
    source: "src/rules/authorizations.ts",
  },
  {
    id: "capitation-ignores-quantity",
    statement:
      "No pacote de capitation, o teto de sessões é o máximo mensal puro. Nos demais tipos, o teto é o máximo mensal multiplicado pela quantidade autorizada.",
    rationale:
      "Capitation é valor fixo por paciente: a quantidade não multiplica nada. Aplicar a multiplicação nele cria saldo que o convênio não vai pagar.",
    source: "src/rules/authorizations.ts",
  },
  {
    id: "partial-authorization-is-not-authorization",
    statement:
      "Autorização parcial significa que o convênio liberou menos sessões que o pedido. Não pode ser exibida como autorizada.",
    rationale:
      "Pintada de verde, a clínica agenda o que não foi autorizado e descobre no faturamento. A diferença entre pedido e autorizado é a informação que falta na tela.",
    source: "src/rules/authorizations.ts",
  },
  {
    id: "sync-error-is-not-denial",
    statement:
      "Erro de sincronização é falha da integração, não decisão do convênio. A saída é reenviar, não remontar o pedido.",
    rationale:
      "Tratado como recusa, manda a clínica refazer um pedido que estava correto — e o prazo do convênio corre enquanto isso.",
    source: "src/rules/authorizations.ts",
  },
  {
    id: "pending-status-names-who-acts-next",
    statement:
      "Cada situação de espera diz de quem é a próxima ação: em análise é do convênio, aguardando justificativa é de quem pediu, aguardando documentação é da clínica.",
    rationale:
      "Sem isso, as três viram “pendente” e a fila deixa de ser acionável. Metade do trabalho da operação é decidir o que é dela.",
    source: "src/rules/authorizations.ts",
  },
  {
    id: "only-admin-edits-authorization",
    statement:
      "Criar, editar, apagar, importar e replicar autorização é exclusivo do admin. Admin de clínica e operação apenas consultam.",
    rationale:
      "`AuthorizationPolicy` casa o átomo com a string `\"admin\"` diretamente, sem lista. Quem opera a central de autorizações no dia a dia não altera nada nela.",
    source: "src/rules/authorizations.ts",
  },
];

/* ================================================================= saldo */

/**
 * Implementação de `capitation-ignores-quantity`, espelhando
 * `Availability.max_allowed/2`.
 */
export function maxAllowed(pkg: AuthorizationPackage): number {
  if (pkg.packageType === "capitation") return pkg.maxByMonth;
  return pkg.maxByMonth * (pkg.quantity || 1);
}

export function remaining(pkg: AuthorizationPackage): number {
  return Math.max(0, maxAllowed(pkg) - pkg.executions);
}

export function hasRoom(pkg: AuthorizationPackage): boolean {
  return pkg.executions < maxAllowed(pkg);
}

/** Pacotes sem saldo. É a lista que explica por que a autorização não serve. */
export function exhaustedPackages(authorization: Authorization): AuthorizationPackage[] {
  return authorization.packages.filter((pkg) => !hasRoom(pkg));
}

/* =========================================================== validade */

/**
 * A janela do monólito é aberta nas duas pontas: `duration_start_at < fim` e
 * `duration_end_at > início`. Comparar só a data do agendamento é o mesmo que
 * usar um período de duração zero, e é o que esta função faz.
 */
export function isWithinValidity(authorization: Authorization, date: string): boolean {
  const day = date.slice(0, 10);
  return authorization.validFrom <= day && day <= authorization.validUntil;
}

export function daysUntilExpiry(authorization: Authorization, now: string): number {
  const end = Date.parse(`${authorization.validUntil}T00:00:00.000-03:00`);
  const today = Date.parse(`${now.slice(0, 10)}T00:00:00.000-03:00`);
  return Math.round((end - today) / 86_400_000);
}

/* ======================================================== disponibilidade */

type Decision = { allowed: boolean; reason?: string };

/**
 * Implementação de `authorization-availability-needs-all-three`, espelhando
 * `Availability.authorizations_with_available_packages/1`.
 *
 * A ordem das verificações é escolha deste repositório, não do monólito — lá as
 * três acontecem numa consulta só. A ordem aqui vai da causa mais estrutural
 * para a mais circunstancial, porque é a ordem em que quem marca consegue agir:
 * situação errada exige falar com o convênio, validade vencida exige nova
 * autorização, saldo esgotado exige esperar o mês virar.
 */
export function canScheduleAgainst(
  authorization: Authorization,
  date: string,
): Decision {
  if (authorization.status !== "authorized") {
    return {
      allowed: false,
      reason: `${statusLabel(authorization.status)}: ${nextActionFor(authorization.status)}`,
    };
  }

  if (!isWithinValidity(authorization, date)) {
    return {
      allowed: false,
      reason: `Fora da validade da autorização, que vale de ${br(authorization.validFrom)} a ${br(authorization.validUntil)}.`,
    };
  }

  const exhausted = exhaustedPackages(authorization);
  if (exhausted.length > 0) {
    const names = exhausted.map((pkg) => pkg.name).join(", ");
    return {
      allowed: false,
      // O `Enum.all?` do monólito trava a autorização inteira por um pacote só.
      // Nomear qual foi é o que evita a leitura de que "a autorização acabou".
      reason:
        exhausted.length === authorization.packages.length
          ? `Sem saldo em nenhum pacote: ${names}.`
          : `Sem saldo em ${names}. A autorização inteira fica indisponível enquanto um pacote estiver esgotado, mesmo que os outros tenham saldo.`,
    };
  }

  return { allowed: true };
}

function br(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/* ============================================================== situação */

const STATUS_LABEL: Record<AuthorizationStatus, string> = {
  pending: "Pendente",
  analysing: "Em análise",
  authorized: "Autorizada",
  partially_authorized: "Autorizada parcialmente",
  denied: "Negada",
  waiting_requester_justification: "Aguardando justificativa",
  waiting_provider_documentation: "Aguardando documentação",
  sync_error: "Erro na sincronização",
  invoiced: "Faturada",
  cancelled: "Cancelada",
};

export function statusLabel(status: AuthorizationStatus): string {
  return STATUS_LABEL[status];
}

/**
 * Implementação de `pending-status-names-who-acts-next`.
 *
 * Sem isto, quatro situações diferentes viram "pendente" na tela e a fila deixa
 * de ser acionável. Metade do trabalho da operação é decidir o que é dela.
 */
export function nextActionFor(status: AuthorizationStatus): string {
  return {
    pending: "enviada ao convênio, ainda sem resposta. Nada a fazer além de acompanhar.",
    analysing: "o convênio está avaliando. Nada é esperado da clínica.",
    authorized: "liberada para agendar.",
    partially_authorized:
      "o convênio liberou menos sessões que o pedido. Confira o saldo antes de marcar.",
    denied: "o convênio negou. Um novo pedido precisa ser montado.",
    waiting_requester_justification:
      "falta a justificativa de quem pediu. A ação é do profissional solicitante.",
    waiting_provider_documentation:
      "falta documento da clínica. A ação é da operação, e é o que destrava.",
    sync_error: "a integração falhou. Reenviar resolve — o pedido em si está correto.",
    invoiced: "já faturada. O ciclo dela terminou.",
    cancelled: "cancelada. Não conta para saldo nem para faturamento.",
  }[status];
}

/** Quem age em seguida, para a fila poder ser filtrada por responsabilidade. */
export function actor(status: AuthorizationStatus): "clinic" | "insurer" | "requester" | "none" {
  switch (status) {
    case "waiting_provider_documentation":
    case "sync_error":
    case "denied":
      return "clinic";
    case "waiting_requester_justification":
      return "requester";
    case "pending":
    case "analysing":
      return "insurer";
    default:
      return "none";
  }
}

/**
 * Implementação de `partial-authorization-is-not-authorization`.
 *
 * Devolve quantas sessões faltaram em relação ao pedido, ou `undefined` quando
 * não há corte. Um número é mais útil que um aviso: é ele que decide se a
 * clínica remarca, pede complementar ou conversa com a família.
 */
export function shortfall(authorization: Authorization): number | undefined {
  if (authorization.status !== "partially_authorized") return undefined;
  const granted = authorization.packages.reduce((sum, pkg) => sum + maxAllowed(pkg), 0);
  const missing = authorization.requestedSessions - granted;
  return missing > 0 ? missing : undefined;
}

/* ============================================================= permissão */

export function canEditAuthorization(permissions: string[]): Decision {
  if (!permissions.includes("authorizations.edit")) {
    return {
      allowed: false,
      reason:
        "Só o admin edita autorização. Admin de clínica e operação consultam a central, mas não alteram.",
    };
  }
  return { allowed: true };
}

/**
 * Ordem da fila: primeiro o que espera ação da clínica.
 *
 * Data de pedido desempata, da mais antiga para a mais nova, porque o prazo do
 * convênio corre desde ela.
 */
export function queueOrder(authorizations: Authorization[]): Authorization[] {
  const weight: Record<ReturnType<typeof actor>, number> = {
    clinic: 0,
    requester: 1,
    insurer: 2,
    none: 3,
  };
  return [...authorizations].sort((a, b) => {
    const byActor = weight[actor(a.status)] - weight[actor(b.status)];
    if (byActor !== 0) return byActor;
    return a.requestDate.localeCompare(b.requestDate);
  });
}

/* ============================================== Renovação da janela */

import type {
  AuthorizationRenewalData,
  AuthorizationWindow,
} from "../contracts/index.js";

/**
 * Regras da renovação automática da janela.
 *
 * `PatientAuthorizations.Workers.AutoRenewWorker` estende `duration_end_at`
 * três meses à frente. `PatientAuthorization` é o **período** — tem
 * `has_many :authorizations` e nenhuma quantidade.
 */
export const authorizationRenewalRules: Rule[] = [
  {
    id: "renewing-the-window-does-not-restore-sessions",
    statement:
      "A renovação move a data de fim da janela. Não cria guia nova nem devolve sessão: o saldo continua sendo o das guias que já estavam lá.",
    rationale:
      "“Autorização renovada” é lido como “o paciente tem sessões de novo”. Quando o saldo estava em zero, a renovação prolonga um recipiente vazio — e alguém só descobre ao tentar marcar.",
    source: "src/rules/authorizations.ts",
  },
  {
    id: "only-one-window-renews-per-patient",
    statement:
      "Um índice único impede mais de uma janela com renovação automática por paciente: “Paciente já possui um padrão de autorização com renovação automática”.",
    rationale:
      "É a decisão certa — duas janelas renovando sozinhas produziriam períodos sobrepostos e ninguém saberia qual vale. Vale registrar porque a mensagem só aparece na hora de salvar a segunda.",
    source: "src/rules/authorizations.ts",
  },
];

/** Implementação de `renewing-the-window-does-not-restore-sessions`. */
export function renewalRestoresSessions(): boolean {
  return false;
}

/** Janelas que vão renovar e chegar na data nova sem saldo nenhum. */
export function renewsIntoEmpty(data: AuthorizationRenewalData): AuthorizationWindow[] {
  return data.windows.filter(
    (window) => window.autoRenew && window.remainingSessions === 0,
  );
}

/** O que a renovação de fato muda, em uma frase — e o que ela não muda. */
export function whatRenewalChanges(window: AuthorizationWindow): string {
  if (window.remainingSessions === 0) {
    return "A janela vai até mais longe e continua sem sessão nenhuma. Renovar move a data; quem repõe saldo é uma guia nova.";
  }
  return `A janela vai até mais longe, com as ${window.remainingSessions} ${window.remainingSessions === 1 ? "sessão que resta" : "sessões que restam"} nas guias atuais. A renovação não acrescenta nenhuma.`;
}

/** Implementação de `only-one-window-renews-per-patient`. */
export function canEnableAutoRenew(
  data: AuthorizationRenewalData,
  patientName: string,
): { allowed: boolean; reason?: string } {
  const jaTem = data.windows.some(
    (window) => window.patientName === patientName && window.autoRenew,
  );
  if (!jaTem) return { allowed: true };
  return {
    allowed: false,
    reason:
      "Este paciente já tem uma janela com renovação automática. Duas renovando sozinhas produziriam períodos sobrepostos, e ninguém saberia qual vale.",
  };
}
