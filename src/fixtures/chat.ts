import type { Fixture } from "@brucesantos/design-space";
import type { ChatData, ChatMessage } from "../contracts/index.js";

/**
 * Fixtures do chat multidisciplinar.
 *
 * Uma semana de conversa sobre o Théo entre quatro pessoas de especialidades
 * diferentes — que é o ponto do canal. A troca inclui o aplicador, para quem
 * este é o único lugar escrito do caso.
 *
 * Uma das mensagens menciona alguém que não alcança o chat, de propósito: é o
 * caso em que o sistema real notifica e a tela não abre.
 */

const NOW = "2026-07-30T09:00:00.000-03:00";
const THEO = { id: "pac-theo", name: "Théo Andrade Lins", birthDate: "2019-11-04" };

function message(overrides: Partial<ChatMessage> & { id: string }): ChatMessage {
  return {
    content: "",
    authorName: "Marina Okabe",
    authorRole: "Terapeuta",
    at: "2026-07-27T15:20:00.000-03:00",
    mentions: [],
    ...overrides,
  };
}

const CONVERSA: ChatMessage[] = [
  message({
    id: "m1",
    authorName: "Otávio Ferrandini",
    authorRole: "Aplicador",
    at: "2026-07-27T15:20:00.000-03:00",
    content:
      "Na sessão de hoje o Théo cobriu os ouvidos três vezes quando o ar-condicionado ligou. Não tinha acontecido antes.",
  }),
  message({
    id: "m2",
    authorName: "Marina Okabe",
    authorRole: "Terapeuta",
    at: "2026-07-27T17:05:00.000-03:00",
    content:
      "@clara vale olhar isso na avaliação sensorial? Na minha sessão de ontem ele também saiu da sala quando o aspirador passou no corredor.",
    mentions: ["clara"],
  }),
  message({
    id: "m3",
    authorName: "Clara Vidigal",
    authorRole: "Supervisor",
    at: "2026-07-28T09:12:00.000-03:00",
    content:
      "Vale sim. Vou incluir na próxima devolutiva e conversar com a mãe. Por enquanto, se ele cobrir os ouvidos, aceitem a saída da sala sem insistir — não é fuga da tarefa.",
  }),
  message({
    id: "m4",
    authorName: "Rui Sampaio Neto",
    authorRole: "Especialista",
    at: "2026-07-28T14:40:00.000-03:00",
    content:
      "Confirmo pela fono: hoje ele respondeu bem até o barulho do corredor, aí travou. Ajustei a atividade e voltou.",
  }),
  message({
    id: "m5",
    authorName: "Clara Vidigal",
    authorRole: "Supervisor",
    at: "2026-07-29T11:30:00.000-03:00",
    content:
      "@helena consegue reservar a Sala 2 para o Théo nas terças? É a mais silenciosa.",
    mentions: ["helena"],
  }),
];

/** Quem existe na unidade, com o papel de cada um. */
const DIRETORIO = [
  { username: "clara", role: "supervisor" },
  { username: "marina", role: "therapeutic_companion" },
  { username: "otavio", role: "applicator" },
  { username: "rui", role: "specialist" },
  // A recepcionista existe e não alcança o chat: é o caso da menção que não chega.
  { username: "helena", role: "attendant" },
];

function chat(overrides: Partial<ChatData> = {}): ChatData {
  return {
    patient: THEO,
    messages: CONVERSA,
    currentUser: { username: "clara", name: "Clara Vidigal", role: "supervisor" },
    directory: DIRETORIO,
    now: NOW,
    ...overrides,
  };
}

export const chatFixtures: Fixture<ChatData>[] = [
  {
    id: "chat-week",
    label: "Uma semana de conversa",
    description:
      "Quatro pessoas de especialidades diferentes coordenando o caso, incluindo o aplicador.",
    data: chat(),
  },
  {
    id: "chat-as-applicator",
    label: "O chat visto pelo aplicador",
    description:
      "Para ele, é a única superfície escrita do caso: não vê programa, protocolo nem prontuário.",
    data: chat({
      currentUser: { username: "otavio", name: "Otávio Ferrandini", role: "applicator" },
    }),
  },
  {
    id: "chat-mention-without-access",
    label: "Menção a quem não alcança o chat",
    description:
      "A recepcionista foi mencionada. A notificação sai e a tela não abre para ela.",
    data: chat({
      currentUser: { username: "clara", name: "Clara Vidigal", role: "supervisor" },
    }),
  },
  {
    id: "chat-empty",
    label: "Nenhuma mensagem ainda",
    description: "Caso recém-aberto, antes da primeira coordenação escrita.",
    data: chat({ messages: [] }),
  },
];


