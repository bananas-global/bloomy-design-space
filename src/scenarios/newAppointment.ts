import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da tentativa de marcar.
 *
 * O módulo de agenda tinha quatro regras, escritas antes de o monólito ser
 * lido a fundo. O sistema real tem **sete verificadores**, executados em ordem
 * fixa, e um `Enum.find_value` que para no primeiro. Estes cenários existem
 * para portar o que estava faltando: não a regra de cada verificação, e sim o
 * custo de recebê-las uma por vez.
 */
export const newAppointmentScenarios: Scenario[] = [
  {
    id: "agenda.new-four-impediments",
    title: "Quatro impedimentos, quatro tentativas de salvar",
    intent:
      "Mostrar o custo de descobrir um problema por vez, e propor a alternativa ao lado do comportamento atual.",
    route: "/agenda/new",
    persona: "attendant",
    fixture: "new-appointment-four-impediments",
    rules: ["impediments-are-revealed-one-at-a-time", "impediment-order-is-code-order"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "A lista de impedimentos é ordenada (`ol`), porque a ordem é informação. Cada item tem rótulo textual além da cor.",
    },
    status: "in-review",
    preconditions: [
      "`ScheduleVerification` compõe sete verificadores e usa `Enum.find_value`.",
      "Este horário falha em quatro deles ao mesmo tempo.",
    ],
    expected: [
      "Os quatro aparecem de uma vez, na ordem em que o sistema os verifica.",
      "A tela diz quantas tentativas de salvar isso seria hoje, e qual apareceria primeiro.",
      "Cada impedimento diz de quem é resolver.",
    ],
    tags: ["regra", "decisão", "exceção"],
  },
  {
    id: "agenda.new-inactive-professional",
    title: "O profissional está desativado",
    intent:
      "Fixar o primeiro verificador da lista — e o único cujo dono não é nem a coordenação nem a recepção.",
    route: "/agenda/new",
    persona: "attendant",
    fixture: "new-appointment-inactive-professional",
    rules: ["impediment-order-is-code-order"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["`VerifyProfessionalActive` é o primeiro do array de verificadores."],
    expected: [
      "A frase é a do sistema real, com o nome dentro.",
      "O destinatário é o People, que reativa o cadastro.",
      "Marcar fica indisponível, com esse motivo.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "agenda.new-room-has-room",
    title: "A sala tem atendimento e ainda cabe",
    intent:
      "Impedir que se recuse um horário que caberia — “ocupada” só quer dizer cheia.",
    route: "/agenda/new",
    persona: "attendant",
    fixture: "new-appointment-room-has-room",
    rules: ["room-capacity-is-not-one"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["`VerifyRoomAvailability` compara `room.capacity <= schedule_count`."],
    expected: [
      "A sala mostra ocupação contra capacidade, e não só um nome.",
      "A tela diz quantos lugares ainda cabem.",
      "Nenhum impedimento aparece: a verificação passou.",
    ],
    tags: ["regra", "sucesso"],
  },
  {
    id: "agenda.new-therapeutic-companion",
    title: "Acompanhamento terapêutico não tem sala",
    intent:
      "Dizer que uma verificação não rodou, para que a ausência de sala não seja lida como cadastro incompleto.",
    route: "/agenda/new",
    persona: "coordinator",
    fixture: "new-appointment-therapeutic-companion",
    rules: ["room-is-not-verified-outside-the-clinic"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["`VerifyRoomAvailability` só roda quando `schedule_type != :at`."],
    expected: [
      "A tela diz que a verificação de sala não rodou, e por quê.",
      "A sala aparece como “não se aplica”, e não como campo vazio.",
      "O horário pode ser marcado normalmente.",
    ],
    tags: ["decisão", "sucesso"],
  },
  {
    id: "agenda.new-clear",
    title: "Um horário sem impedimento",
    intent:
      "Definir o sucesso nomeando o que foi conferido — um “ok” mudo não distingue verificado de não verificado.",
    route: "/agenda/new",
    persona: "attendant",
    fixture: "new-appointment-clear",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela lista as sete verificações que passaram.",
      "Marcar atendimento fica disponível.",
    ],
    tags: ["sucesso"],
  },
];
