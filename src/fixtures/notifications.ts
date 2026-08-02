import type { Fixture } from "@brucesantos/design-space";
import type { NotificationItem, NotificationsData } from "../contracts/index.js";

/**
 * Fixtures das notificações.
 *
 * Os textos são os dos quatro remetentes reais, com nomes sintéticos. Reproduzir
 * o formato importa: é dele que sai tudo o que a tela precisa dizer — a linha
 * `Paciente:` que carrega dado clínico, a mensagem de transferência que não diz
 * qual agendamento, e a URL vazia que três dos quatro remetentes gravam.
 */

const MARINA = { id: "usr-marina", name: "Marina Okabe", role: "therapeutic_companion" };
const OTAVIO = { id: "usr-otavio", name: "Otávio Ferrandini", role: "applicator" };

function item(overrides: Partial<NotificationItem> & { id: string }): NotificationItem {
  return {
    title: "",
    content: "",
    at: "2026-07-29T10:00:00.000-03:00",
    ...overrides,
  };
}

/** O texto de `AssumeSchedule.assume/2`, com a URL vazia que ele grava. */
const ASSUMIDO = item({
  id: "n-assumido",
  title: "Agendamento assumido",
  content: [
    "Você assumiu um agendamento pendente.",
    "Fonoaudiologia.",
    "Sessão de intervenção ABA.",
    "Paciente: Théo Andrade Lins",
    "Sala Girassol - 2",
    "Data: 29/07",
    "Horário: 14:00 - 15:00",
  ].join("\n"),
  onClickUrl: "",
  at: "2026-07-29T13:58:00.000-03:00",
});

/** O texto de `AssumeSchedule`, ramo do profissional que perdeu o agendamento. */
const TRANSFERIDO = item({
  id: "n-transferido",
  title: "Agendamento transferido",
  content: "Um agendamento seu foi assumido por um supervisor.",
  onClickUrl: "",
  at: "2026-07-29T13:58:00.000-03:00",
});

/** O texto de `AssumeSchedule.overdue_schedule_notification/2`. */
const ATRASADO = item({
  id: "n-atrasado",
  title: "Agendamento atrasado",
  content: [
    "Um supervisor apontou um atendimento pendente:",
    "Terapia ocupacional.",
    "Sessão de intervenção ABA.",
    "Paciente: Helena Vasconcelos Prado",
    "Sala Ipê - 4",
    "Data: 28/07",
    "Horário: 09:00 - 10:00",
  ].join("\n"),
  onClickUrl: "",
  at: "2026-07-28T11:20:00.000-03:00",
});

/** O texto de `SendMessage.notify_users/2` — a única URL real do sistema. */
const MENCAO = item({
  id: "n-mencao",
  title: "Nova menção no chat multidisciplinar",
  content:
    "Clara Vidigal te mencionou no chat multidisciplinar do paciente Théo Andrade Lins",
  onClickUrl: "/backoffice/pacientes/pac-theo/editar?message=m2",
  at: "2026-07-27T17:05:00.000-03:00",
});

export const notificationFixtures: Fixture[] = [
  {
    id: "notifications-unread",
    label: "Quatro notificações, três não lidas",
    description:
      "Quatro notificações da terapeuta, três não lidas — uma de cada remetente real do sistema.",
    data: {
      currentUser: MARINA,
      items: [
        ASSUMIDO,
        TRANSFERIDO,
        ATRASADO,
        { ...MENCAO, readAt: "2026-07-27T18:40:00.000-03:00" },
      ],
    } satisfies NotificationsData,
  },
  {
    id: "notifications-link-does-not-open",
    label: "A menção que aponta para uma tela fechada",
    description:
      "O aplicador recebe a menção do chat. A URL abre o formulário de edição do paciente, que o perfil dele não alcança.",
    data: {
      currentUser: OTAVIO,
      items: [MENCAO],
    } satisfies NotificationsData,
  },
  {
    id: "notifications-all-read",
    label: "Tudo lido",
    description: "Tudo lido: o contador zera e “marcar todas” perde a função.",
    data: {
      currentUser: MARINA,
      items: [
        { ...ASSUMIDO, readAt: "2026-07-29T14:10:00.000-03:00" },
        { ...MENCAO, readAt: "2026-07-27T18:40:00.000-03:00" },
      ],
    } satisfies NotificationsData,
  },
  {
    id: "notifications-empty",
    label: "Nenhuma notificação",
    description: "Nenhuma notificação — o estado em que a maioria das pessoas passa a maior parte do tempo.",
    data: {
      currentUser: MARINA,
      items: [],
    } satisfies NotificationsData,
  },
];
