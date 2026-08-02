import type { Rule } from "@brucesantos/design-space";
import type { ChatData, ChatMessage } from "../contracts/index.js";

/**
 * Regras do chat multidisciplinar.
 *
 * O Bloomy tem um chat, e a tentação é tratá-lo como recurso secundário — um
 * mensageiro embutido. Ele não é. É o único lugar em que profissionais de
 * especialidades diferentes coordenam um caso por escrito, e o schema deixa
 * isso claro: mensagem tem conteúdo, autor e paciente, e nenhum campo de edição
 * ou exclusão.
 *
 * Traduzidas de `MultidisciplinaryChat.Message`, `SendMessage` e `ChatPolicy`.
 */
export const chatRules: Rule[] = [
  {
    id: "chat-is-per-patient",
    statement:
      "O canal é do paciente, não da equipe. Cada caso tem a sua conversa, e ela acompanha o paciente.",
    rationale:
      "Uma conversa por equipe misturaria casos e obrigaria a procurar. Uma por paciente é consultável meses depois, quando alguém pergunta por que a conduta mudou em julho.",
    source: "src/rules/chat.ts",
  },
  {
    id: "chat-messages-are-permanent",
    statement:
      "Mensagem enviada não é editada nem apagada. O schema não tem campo para isso.",
    rationale:
      "É registro de coordenação clínica. Poder reescrever o que se disse sobre a conduta de um paciente destruiria o valor de consultá-lo depois — e a tela precisa avisar isso antes do envio, não depois.",
    source: "src/rules/chat.ts",
  },
  {
    id: "mention-notifies-but-does-not-grant",
    statement:
      "Mencionar alguém com arroba envia uma notificação. Não dá a essa pessoa acesso ao chat nem ao paciente.",
    rationale:
      "A notificação chega e a tela não abre. Quem menciona precisa saber disso, senão delega uma tarefa para alguém que não consegue lê-la.",
    source: "src/rules/chat.ts",
  },
  {
    id: "chat-is-the-applicators-only-written-channel",
    statement:
      "O aplicador alcança o chat, e é a única superfície escrita do caso que ele alcança: não vê programa, protocolo nem prontuário.",
    rationale:
      "Quem aplica o programa é quem observa o paciente executando. Fechar o chat para ele deixaria a observação sem canal — e é a observação de quem aplica que costuma antecipar a mudança de conduta.",
    source: "src/rules/chat.ts",
  },
];

/** Papéis que alcançam o chat, de `ChatPolicy.can?(role, :show)`. */
export const CHAT_ROLES = [
  "admin",
  "clinic_admin",
  "coordinator",
  "therapeutic_companion",
  "supervisor",
  "applicator",
  "specialist",
];

type Decision = { allowed: boolean; reason?: string };

export function canReadChat(role: string): Decision {
  if (!CHAT_ROLES.includes(role)) {
    return {
      allowed: false,
      reason:
        "O chat do caso é da equipe clínica. Recepção, operação e People não alcançam — nem para ler.",
    };
  }
  return { allowed: true };
}

/**
 * Implementação de `mention-notifies-but-does-not-grant`.
 *
 * O monólito extrai menções com `~r/@([\\w.]+)/` e apara o ponto final, para que
 * "@marina." no fim de uma frase encontre "marina". Reproduzido igual: uma
 * expressão diferente faria a menção falhar em silêncio, que é o pior modo de
 * falhar aqui.
 */
export function extractMentions(content: string): string[] {
  const found = content.match(/@[\w.]+/g) ?? [];
  return [...new Set(found.map((raw) => raw.slice(1).replace(/\.+$/, "")))].filter(
    (name) => name.length > 0,
  );
}

/**
 * Menções que não vão conseguir abrir o chat.
 *
 * É a informação que falta no sistema real: a notificação sai, a pessoa clica e
 * não entra. Quem escreveu precisa saber antes de enviar.
 */
export function mentionsWithoutAccess(
  content: string,
  directory: { username: string; role: string }[],
): { username: string; reason: string }[] {
  return extractMentions(content)
    .map((username) => {
      const person = directory.find((item) => item.username === username);
      if (!person) {
        return { username, reason: "não existe um usuário com esse nome" };
      }
      if (!canReadChat(person.role).allowed) {
        return { username, reason: "o perfil dessa pessoa não alcança o chat do caso" };
      }
      return undefined;
    })
    .filter((item): item is { username: string; reason: string } => item !== undefined);
}

/** Implementação de `chat-messages-are-permanent`. */
export function canEditMessage(): Decision {
  return {
    allowed: false,
    reason:
      "Mensagem do chat não é editada nem apagada: é registro de coordenação clínica, e alguém vai consultá-la meses depois.",
  };
}

export function canSend(content: string): Decision {
  if (content.trim().length === 0) {
    return { allowed: false, reason: "Escreva alguma coisa para enviar." };
  }
  return { allowed: true };
}

/* ================================================================ leitura */

/** Mensagens em ordem cronológica — a conversa se lê de cima para baixo. */
export function inOrder(data: ChatData): ChatMessage[] {
  return [...data.messages].sort((a, b) => a.at.localeCompare(b.at));
}

/** Quantas menções ao usuário atual há na conversa. */
export function mentionsOfCurrentUser(data: ChatData): ChatMessage[] {
  return data.messages.filter((message) =>
    message.mentions.includes(data.currentUser.username),
  );
}

/** Quantas especialidades diferentes escreveram — a medida de multidisciplinar. */
export function participatingRoles(data: ChatData): string[] {
  return [...new Set(data.messages.map((message) => message.authorRole))];
}
