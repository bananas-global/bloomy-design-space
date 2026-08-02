import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da estrutura da unidade.
 *
 * A camada física que a agenda esbarra, e que não aparece em nenhuma tela de
 * agendamento: sala do tipo certo, com capacidade, numa unidade e horário não
 * bloqueados.
 *
 * Dois cenários existem para tornar visível um elo com outro módulo — o campo
 * que dispensa o check-in mora no cadastro do serviço, não na tela de
 * atendimento.
 */
export const structureScenarios: Scenario[] = [
  {
    id: "structure.unit",
    title: "Estrutura da unidade",
    intent:
      "Tornar legível o que a agenda esbarra: salas, serviços e as três origens de bloqueio, num lugar só.",
    route: "/structure",
    persona: "coordinator",
    fixture: "structure-unit",
    rules: ["service-decides-which-rooms-serve", "three-scopes-of-blocking"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada serviço é um artigo com heading próprio. Sala inativa e tipo de sala têm rótulo textual além da cor.",
    },
    status: "in-review",
    preconditions: ["Quatro salas, cinco serviços e quatro bloqueios de três origens diferentes."],
    expected: [
      "Cada sala mostra tipo, capacidade e se está ativa.",
      "Cada serviço diz de que tipo de sala precisa e quantas atendem nesta unidade.",
      "Cada bloqueio traz a saída, e não apenas o motivo.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "structure.no-room-for-service",
    title: "Serviço sem sala disponível",
    intent:
      "Separar falta de sala de erro de cadastro — as duas produzem um serviço inagendável e pedem ações opostas.",
    route: "/structure",
    persona: "coordinator",
    fixture: "structure-no-room-for-service",
    rules: ["room-capacity-limits-the-session", "service-decides-which-rooms-serve"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["A única sala de motricidade da unidade está inativa desde 14/07."],
    expected: [
      "O aviso diz que é falta de sala, e não erro de cadastro.",
      "A sala inativa aparece na lista, marcada, com a data da desativação.",
      "O serviço diz de que tipo de sala precisa.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "structure.impossible-service",
    title: "Serviço impossível de agendar",
    intent:
      "Tornar visível uma contradição que o cadastro aceita e que só aparece quando a recepção tenta usar.",
    route: "/structure",
    persona: "coordinator",
    fixture: "structure-impossible-service",
    rules: ["service-without-room-type-is-a-contradiction"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Serviço com `needs_room` verdadeiro e `room_types` vazio."],
    expected: [
      "O aviso separa este caso do de falta de sala.",
      "O serviço aparece destacado na lista.",
      "A explicação diz que quem descobre é a recepção, na hora de marcar.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "structure.blockings",
    title: "Três origens de bloqueio",
    intent:
      "Garantir que cada bloqueio diga o que fazer — procurar outro dia, outro profissional ou outra unidade.",
    route: "/structure",
    persona: "attendant",
    fixture: "structure-blockings",
    rules: ["three-scopes-of-blocking"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "Feriado no calendário, unidade fechada para almoço, e duas ausências de profissional.",
    ],
    expected: [
      "Cada bloqueio mostra a origem com rótulo próprio.",
      "Cada um traz uma saída diferente, conforme a origem.",
      "Janela e período aparecem distinguidos, porque são frases diferentes na recepção.",
    ],
    tags: ["decisão", "regra"],
  },
  {
    id: "structure.not-chargeable-skips-checkin",
    title: "O serviço decide a dispensa de check-in",
    intent:
      "Fechar o elo com o módulo de Atendimento: a guarda de check-in é desligada por um campo do cadastro do serviço.",
    route: "/structure",
    persona: "operation",
    fixture: "structure-unit",
    rules: ["not-chargeable-service-skips-checkin"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Devolutiva à família com `not_chargeable` verdadeiro."],
    expected: [
      "O serviço aparece marcado como não cobrável.",
      "A tela afirma que ele dispensa o check-in, e que é a guarda do atendimento que não se aplica.",
    ],
    tags: ["regra"],
  },
  {
    id: "structure.empty",
    title: "Unidade sem estrutura",
    intent: "Definir a unidade recém-aberta, antes de qualquer horário poder ser marcado.",
    route: "/structure",
    persona: "admin",
    fixture: "structure-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela explica que sala e serviço são o que a agenda precisa para marcar algo.",
    ],
    tags: ["vazio"],
  },
];
