import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do chat multidisciplinar.
 *
 * A tentação é tratá-lo como recurso secundário. Estes cenários existem para
 * fixar a outra leitura: é o único lugar em que profissionais de especialidades
 * diferentes coordenam um caso por escrito, e o schema — sem edição, sem
 * exclusão — diz que ele é registro, não mensageiro.
 */
export const chatScenarios: Scenario[] = [
  {
    id: "chat.week",
    title: "Uma semana de conversa",
    intent:
      "Definir o canal como coordenação de caso, e não como conversa de equipe — o papel de quem escreve faz parte da mensagem.",
    route: "/patients/pac-theo/chat",
    persona: "supervisor",
    fixture: "chat-week",
    rules: ["chat-is-per-patient"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "A conversa é uma lista ordenada em ordem cronológica. Menção ao usuário atual tem rótulo textual além da cor.",
    },
    status: "ported",
    preconditions: ["Quatro pessoas de especialidades diferentes, entre 27 e 29 de julho."],
    expected: [
      "Cada mensagem mostra o papel de quem escreveu, e não só o nome.",
      "A conversa aparece em ordem cronológica, de cima para baixo.",
      "As menções ao usuário atual ficam destacadas com rótulo.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "chat.permanence-before-sending",
    title: "O aviso de permanência vem antes do envio",
    intent:
      "Impedir que alguém descubra que não dá para corrigir quando já não dá — que é a pior hora de descobrir.",
    route: "/patients/pac-theo/chat",
    persona: "supervisor",
    fixture: "chat-week",
    rules: ["chat-messages-are-permanent"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["O schema de `Message` não tem campo de edição nem de exclusão."],
    expected: [
      "A frase sobre permanência fica ao lado do campo, associada por `aria-describedby`.",
      "Não é um pedido de confirmação: é informação antes da ação.",
      "A justificativa é dita — alguém vai consultar meses depois.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "chat.mention-without-access",
    title: "Menção que não vai chegar",
    intent:
      "Avisar antes do envio que a pessoa mencionada não abre o chat — hoje a notificação sai e a tela dela não abre.",
    route: "/patients/pac-theo/chat",
    persona: "supervisor",
    fixture: "chat-mention-without-access",
    rules: ["mention-notifies-but-does-not-grant"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`ChatPolicy.can?(role, :show)` não inclui recepção, operação nem People.",
      "A conversa já tem uma menção à recepcionista, feita antes.",
    ],
    expected: [
      "Ao escrever uma menção a quem não alcança, a tela avisa antes do envio.",
      "O aviso diz o que acontece hoje: a notificação sai e a tela não abre.",
      "Menção a quem não existe recebe aviso próprio, com motivo diferente.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "chat.applicators-only-channel",
    title: "O único canal escrito do aplicador",
    intent:
      "Tornar visível que, para o aplicador, este é o único lugar do caso — e que fechá-lo silenciaria quem mais observa.",
    route: "/patients/pac-theo/chat",
    persona: "applicator",
    fixture: "chat-as-applicator",
    rules: ["chat-is-the-applicators-only-written-channel"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "O aplicador não alcança programa, protocolo nem prontuário, e alcança o chat.",
    ],
    expected: [
      "A tela afirma que este é o canal escrito dele para o caso.",
      "A justificativa é dita: é a observação de quem aplica que antecipa mudança de conduta.",
      "Ele lê e escreve normalmente, sem restrição adicional.",
    ],
    tags: ["permissão", "decisão"],
  },
  {
    id: "chat.empty",
    title: "Nenhuma mensagem ainda",
    intent: "Definir o começo, explicando para que o canal serve a quem nunca o usou.",
    route: "/patients/pac-theo/chat",
    persona: "therapeutic_companion",
    fixture: "chat-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "A tela explica que ali se registra observação e se combina conduta.",
      "E que é consultável meses depois.",
    ],
    tags: ["vazio"],
  },
];
