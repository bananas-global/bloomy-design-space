import type { Rule } from "@brucesantos/design-space";
import type { NotificationItem, NotificationsData } from "../contracts/index.js";

/**
 * Regras das notificações.
 *
 * O sino é o recurso que mais parece resolvido e menos foi olhado. O schema tem
 * três campos — título, conteúdo e URL — e o estado de leitura mora no vínculo
 * com a pessoa, não na notificação. Só isso já decide metade da tela.
 *
 * A outra metade vem de ler **quem envia**. São quatro chamadas de
 * `Notify.notify/4` no sistema inteiro, e elas revelam mais que o schema:
 * três passam string vazia como URL, e uma escreve nome de paciente,
 * especialidade e serviço dentro do texto.
 *
 * Traduzido de `Bloomy.Backoffice.Notify`, `Bloomy.Backoffice.NotificationUser`,
 * `Schedules.AssumeSchedule` e `MultidisciplinaryChat.SendMessage`.
 */
export const notificationRules: Rule[] = [
  {
    id: "read-state-belongs-to-the-person",
    statement:
      "Lido não é propriedade da notificação: é do vínculo entre ela e cada pessoa. A mesma notificação está lida para quem abriu e não lida para os outros.",
    rationale:
      "É o modelo certo, e a tela precisa refletir isso — “marcar todas como lidas” age sobre os vínculos de quem clicou, e não sobre as notificações. Uma tela que mostrasse um contador global estaria mentindo para todo mundo menos uma pessoa.",
    source: "src/rules/notifications.ts",
  },
  {
    id: "notification-may-lead-nowhere",
    statement:
      "Três dos quatro remetentes passam string vazia como URL de destino. A notificação chega, diz que algo aconteceu com um agendamento, e não leva até ele.",
    rationale:
      "String vazia não é ausência: renderizada como link, ela é clicável e não vai a lugar nenhum. As duas situações — sem destino e com destino vazio — precisam ser distinguidas na tela, porque só uma delas é um defeito.",
    source: "src/rules/notifications.ts",
  },
  {
    id: "notification-text-is-a-copy",
    statement:
      "Título e conteúdo são gravados no envio. Não acompanham o dado: se o agendamento for remarcado ou o paciente renomeado, a notificação continua dizendo o que dizia.",
    rationale:
      "Para um registro do que foi comunicado, congelar é correto. O risco é lê-la como estado atual — por isso a tela mostra sempre quando a notificação foi criada, junto do texto.",
    source: "src/rules/notifications.ts",
  },
  {
    id: "notification-carries-what-the-screen-would-check",
    statement:
      "O texto de “Agendamento assumido” traz nome do paciente, especialidade e serviço. A leitura da notificação não passa por política nenhuma: o que a tela do paciente checaria, o sino entrega direto.",
    rationale:
      "Não é um vazamento aberto — a notificação vai para quem participa do agendamento. Mas é um canal que contorna a verificação, e ele cresce sozinho: cada remetente novo decide por conta própria quanto conteúdo clínico cabe num texto que ninguém revisa. Vale fixar o que pode entrar antes de existirem quarenta remetentes.",
    source: "src/rules/notifications.ts",
  },
  {
    id: "transferred-without-saying-which",
    statement:
      "“Um agendamento seu foi assumido por um supervisor” não diz qual agendamento, de qual paciente, em que horário — e não tem link.",
    rationale:
      "É a única notificação que comunica perda de algo, e é a menos identificada das quatro. Quem recebe não consegue nem conferir se concorda.",
    source: "src/rules/notifications.ts",
  },
];

type Decision = { allowed: boolean; reason?: string };

/* =============================================================== leitura */

/** Implementação de `read-state-belongs-to-the-person`: a ausência é o estado. */
export function isUnread(item: NotificationItem): boolean {
  return item.readAt === undefined;
}

export function unreadCount(data: NotificationsData): number {
  return data.items.filter(isUnread).length;
}

/**
 * A lista, na ordem em que o sistema real a entrega: vínculo mais recente
 * primeiro, e não notificação mais recente. São a mesma coisa hoje porque o
 * vínculo nasce junto — a diferença apareceria no dia em que alguém fosse
 * adicionado a uma notificação antiga.
 */
export function inOrder(data: NotificationsData): NotificationItem[] {
  return [...data.items].sort((a, b) => b.at.localeCompare(a.at));
}

/** Só faz sentido quando há o que marcar — e age sobre os vínculos de quem clica. */
export function canMarkAllRead(data: NotificationsData): Decision {
  if (unreadCount(data) === 0) {
    return { allowed: false, reason: "Você não tem notificações não lidas." };
  }
  return { allowed: true };
}

/* =============================================================== destino */

export type LinkTarget =
  | { kind: "none" }
  | { kind: "empty" }
  | { kind: "url"; href: string; requiredPermission?: string };

/**
 * As URLs que os remetentes reais produzem.
 *
 * A tabela é curta de propósito: hoje existe **uma** URL real no sistema
 * inteiro, a da menção no chat, e ela abre o formulário de edição do paciente —
 * não o chat. Manter a tabela explícita, em vez de deduzir por padrão de rota,
 * é o que mantém visível quão pouco do produto o sino alcança.
 */
const URL_PERMISSIONS: { prefix: string; suffix?: string; permission: string }[] = [
  { prefix: "/backoffice/pacientes/", suffix: "/editar", permission: "patients.edit" },
];

/**
 * Implementação de `notification-may-lead-nowhere`.
 *
 * String vazia e ausência são estados diferentes: `undefined` é uma notificação
 * que nunca pretendeu levar a lugar nenhum; `""` é uma que pretendia e não leva.
 */
export function linkTarget(item: NotificationItem): LinkTarget {
  if (item.onClickUrl === undefined) return { kind: "none" };
  if (item.onClickUrl.trim() === "") return { kind: "empty" };

  const match = URL_PERMISSIONS.find(
    (entry) =>
      item.onClickUrl!.startsWith(entry.prefix) &&
      (entry.suffix === undefined || item.onClickUrl!.split("?")[0]!.endsWith(entry.suffix)),
  );

  return { kind: "url", href: item.onClickUrl, requiredPermission: match?.permission };
}

/**
 * A notificação chega para todo mundo; a tela do destino não abre para todo
 * mundo. Antes de oferecer o link, esta função diz se ele vai abrir.
 */
export function canOpen(item: NotificationItem, permissions: string[]): Decision {
  const target = linkTarget(item);

  if (target.kind === "none") {
    return { allowed: false, reason: "Esta notificação não leva a nenhuma tela." };
  }

  if (target.kind === "empty") {
    return {
      allowed: false,
      reason:
        "O destino desta notificação foi gravado vazio. Ela avisa que algo aconteceu com um agendamento e não leva até ele.",
    };
  }

  if (target.requiredPermission && !permissions.includes(target.requiredPermission)) {
    // O identificador da permissão fica na regra e no cenário, onde quem
    // implementa o lê. Aqui vai a frase que a pessoa precisa: o que é a tela
    // de destino e por que ela não abre. Um "exige patients.edit" na cara de
    // quem recebeu a notificação não ajuda ninguém a agir.
    return {
      allowed: false,
      reason: `A notificação chegou e a tela de destino não abre para o seu perfil: ela é o cadastro do paciente, que o seu perfil não edita.`,
    };
  }

  return { allowed: true };
}

/* =============================================================== conteúdo */

/**
 * Implementação de `notification-carries-what-the-screen-would-check`.
 *
 * Procura a linha `Paciente: ` que o template de `AssumeSchedule` escreve. É
 * leitura de string porque o sistema real só tem string — não há campo, não há
 * referência, não há nada além do texto para inspecionar. A fragilidade da
 * detecção é a própria constatação.
 */
export function namesPatient(item: NotificationItem): string | undefined {
  const line = item.content
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.startsWith("Paciente:"));

  const name = line?.slice("Paciente:".length).trim();
  return name && name.length > 0 ? name : undefined;
}

/**
 * Implementação de `transferred-without-saying-which`.
 *
 * Uma notificação identifica seu assunto quando dá para saber, só pelo texto,
 * de que agendamento ela fala — ou quando pelo menos leva a ele.
 */
export function identifiesSubject(item: NotificationItem): boolean {
  if (linkTarget(item).kind === "url") return true;
  return namesPatient(item) !== undefined;
}

/** Notificações que comunicam algo sem dizer sobre o quê nem levar até lá. */
export function unidentified(data: NotificationsData): NotificationItem[] {
  return data.items.filter((item) => !identifiesSubject(item));
}
