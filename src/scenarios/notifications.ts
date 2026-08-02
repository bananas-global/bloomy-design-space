import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários das notificações.
 *
 * O módulo existe para fixar uma leitura que o schema sozinho não dá: o sino
 * alcança quatro situações do produto inteiro, e três delas chegam sem destino.
 * Um Design Space que desenhasse a lista bonita e não dissesse isso teria
 * documentado a aparência do recurso e escondido o estado dele.
 */
export const notificationScenarios: Scenario[] = [
  {
    id: "notifications.unread-list",
    title: "As quatro coisas que o sistema avisa",
    intent:
      "Mostrar o alcance real do sino — quatro remetentes no produto inteiro — e que lida é marca de cada pessoa, não da notificação.",
    route: "/notifications",
    persona: "therapeutic_companion",
    fixture: "notifications-unread",
    rules: ["read-state-belongs-to-the-person", "notification-text-is-a-copy"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Não lida tem rótulo textual além da cor de fundo. Cada notificação é um `article` com título de nível 2.",
    },
    status: "in-review",
    preconditions: [
      "Quatro notificações, uma de cada chamada real de `Notify.notify/4`.",
      "Três não lidas; a menção do chat já foi lida em 27/07.",
    ],
    expected: [
      "O contador diz quantas estão não lidas, e o total ao lado.",
      "A tela afirma que lida é uma marca de quem lê, não da notificação.",
      "A data de recebimento aparece junto do texto, porque o texto é cópia congelada.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "notifications.leads-nowhere",
    title: "O aviso que não leva ao agendamento",
    intent:
      "Separar dois estados que uma tela desatenta apagaria no mesmo cinza: notificação sem destino e notificação com destino gravado vazio.",
    route: "/notifications",
    persona: "therapeutic_companion",
    fixture: "notifications-unread",
    rules: ["notification-may-lead-nowhere", "transferred-without-saying-which"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`AssumeSchedule` passa `\"\"` como `on_click_url` nas três notificações que envia.",
      "String vazia é truthy em Elixir: renderizada como link, ela é clicável.",
    ],
    expected: [
      "“Abrir” fica visível e desabilitado, com o motivo dito por extenso.",
      "O motivo distingue destino vazio de ausência de destino.",
      "“Agendamento transferido” recebe aviso próprio: não diz qual agendamento nem leva a ele.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "notifications.target-does-not-open",
    title: "A notificação chega e a tela não abre",
    intent:
      "Fixar que notificar não é dar acesso — a menção do chat aponta para o formulário de edição do paciente, que o aplicador não alcança.",
    route: "/notifications",
    persona: "applicator",
    fixture: "notifications-link-does-not-open",
    rules: ["notification-may-lead-nowhere"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "A única URL real do sistema é `/backoffice/pacientes/:id/editar?message=:id`.",
      "Ela abre o cadastro do paciente, e não o chat de onde a menção saiu.",
    ],
    expected: [
      "“Abrir” fica indisponível com o motivo dito em português — a tela de destino é o cadastro do paciente.",
      "O identificador da permissão (`patients.edit`) fica aqui e na regra, e não na frase que a pessoa lê.",
      "O aviso é o mesmo que o chat dá antes do envio, agora do lado de quem recebeu.",
    ],
    tags: ["permissão", "exceção"],
  },
  {
    id: "notifications.clinical-text-without-check",
    title: "O texto que entrega o que a tela checaria",
    intent:
      "Declarar que a leitura de uma notificação não passa por política — e que o conteúdo é escrito livremente por cada remetente.",
    route: "/notifications",
    persona: "therapeutic_companion",
    fixture: "notifications-unread",
    rules: ["notification-carries-what-the-screen-would-check"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "O template de `AssumeSchedule` interpola nome do paciente, especialidade, serviço e sala.",
      "Não há campo, tipo nem referência — só texto.",
    ],
    expected: [
      "A tela aponta, na própria notificação, que o texto nomeia o paciente e a especialidade.",
      "E diz o que isso implica: o sino contorna a verificação que a tela do paciente faria.",
      "Nada é removido — o objetivo é decidir o limite antes de existirem quarenta remetentes.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "notifications.all-read",
    title: "Tudo lido",
    intent: "Definir o estado em que a ação principal perde a função, sem escondê-la.",
    route: "/notifications",
    persona: "therapeutic_companion",
    fixture: "notifications-all-read",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "“Marcar todas como lidas” fica visível e desabilitado, com o motivo.",
      "O cabeçalho diz “Tudo lido” em vez de mostrar zero.",
      "Cada notificação mostra quando foi lida por esta pessoa.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "notifications.empty",
    title: "Nenhuma notificação",
    intent:
      "Aproveitar o vazio para dizer o alcance do recurso — é onde a maioria das pessoas passa a maior parte do tempo.",
    route: "/notifications",
    persona: "therapeutic_companion",
    fixture: "notifications-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela lista as quatro situações que geram aviso.",
      "E diz que o resto do produto ainda não notifica nada.",
    ],
    tags: ["vazio"],
  },
];
