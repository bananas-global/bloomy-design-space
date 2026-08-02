import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do auto check-in do totem público.
 *
 * O caso mais concreto do achado 82: duas funções com o mesmo nome, no mesmo
 * fluxo, discordando sobre que dia é hoje — e a tela usa a errada.
 */
export const autoCheckinScenarios: Scenario[] = [
  {
    id: "public.auto-checkin-turned-away",
    title: "O totem diz à família que não há consulta",
    intent:
      "Mostrar a frase literal que a família recebe, porque ela é uma afirmação sobre os filhos dela e é falsa.",
    route: "/public/auto-checkin",
    persona: "attendant",
    fixture: "auto-checkin-evening",
    rules: [
      "the-totem-tells-the-family-something-false",
      "the-public-portal-is-the-last-place-to-fail",
    ],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "O desfecho de cada chegada é dito em palavras na etiqueta.",
    },
    status: "in-review",
    preconditions: [
      "A busca da tela usa `Date.utc_today()`; a clínica é UTC−3.",
      "Duas famílias chegam às 21h15 e às 22h10 com atendimento marcado para o mesmo dia.",
    ],
    expected: [
      "A frase do totem aparece literal, entre aspas.",
      "Cada família é nomeada com a hora da chegada e o horário do atendimento.",
      "A tela diz por que a família não tem motivo para duvidar da frase.",
    ],
    tags: ["regra", "risco", "decisão"],
  },
  {
    id: "public.auto-checkin-two-functions",
    title: "Duas funções com o mesmo nome, e só uma acerta o dia",
    intent:
      "Transformar “problema de fuso” em duas linhas de código que dá para comparar, e explicar por que uma revisão não pega isso.",
    route: "/public/auto-checkin",
    persona: "admin",
    fixture: "auto-checkin-evening",
    rules: ["two-functions-with-one-name-disagree-about-today"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`Checkin.get_scheduled_patients/1` usa `DateTime.now!(\"America/Sao_Paulo\")`.",
      "`get_scheduled_patients/3` do passo de seleção usa `Date.utc_today()`.",
      "A tela do totem chama a segunda.",
    ],
    expected: [
      "As duas datas consultadas aparecem lado a lado.",
      "A tela diz que a forma certa existe no mesmo fluxo e com o mesmo nome.",
      "A tela diz por que o totem é o pior lugar para esse defeito acontecer.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "public.auto-checkin-wrong-day",
    title: "O outro lado da janela: check-in num dia sem atendimento",
    intent:
      "Mostrar a consequência oposta, que não tem quem reclame e por isso não seria encontrada pelo suporte.",
    route: "/public/auto-checkin",
    persona: "operation",
    fixture: "auto-checkin-evening",
    rules: ["the-window-also-lets-tomorrow-check-in"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "A busca da tela já procura o dia seguinte depois das 21h.",
      "Uma família passa às 22h40 com atendimento marcado para amanhã de manhã.",
    ],
    expected: [
      "O check-in indevido aparece separado das recusas.",
      "A tela diz que fica registrada presença num dia sem atendimento.",
      "A tela diz por que esse caso não tem quem reclame.",
    ],
    tags: ["regra", "exceção", "risco"],
  },
  {
    id: "public.auto-checkin-correct-refusal",
    title: "Recusar quem é de outro dia está certo",
    intent:
      "Impedir que a correção seja lida como “o totem não deveria recusar ninguém”.",
    route: "/public/auto-checkin",
    persona: "attendant",
    fixture: "auto-checkin-evening",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A chegada cujo atendimento é de outro dia aparece recusada, e não como engano.",
      "A tela diz que o problema não é recusar, é recusar quem tem consulta.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "public.auto-checkin-daytime",
    title: "Durante o dia, o totem funciona",
    intent: "Fixar o caminho comum, que é onde o defeito passa despercebido.",
    route: "/public/auto-checkin",
    persona: "attendant",
    fixture: "auto-checkin-daytime",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "Nenhuma família aparece recusada por engano.",
      "A recusa correta permanece.",
    ],
    tags: ["sucesso"],
  },
];
