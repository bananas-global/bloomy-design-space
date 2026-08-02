import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do mapa de horas.
 *
 * O módulo existe por causa de uma escolha do sistema real que é fácil de não
 * notar: quando um horário esbarra num conflito, ele não falha — apaga o campo
 * em conflito e cria o agendamento assim mesmo. Um mapa aplicado com buracos
 * parece pronto.
 */
export const hourMapScenarios: Scenario[] = [
  {
    id: "hour-map.with-conflicts",
    title: "Mapa desenhado, com conflitos",
    intent:
      "Tornar visível, antes de aplicar, quantos horários vão nascer incompletos — e de quem é resolver cada um.",
    route: "/patients/pac-theo/hour-map",
    persona: "coordinator",
    fixture: "hour-map-with-conflicts",
    rules: ["hour-map-generates-with-holes", "conflict-family-decides-what-is-lost"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada horário é um item de lista com o que falta em texto. O resumo vem antes da grade, na ordem de leitura.",
    },
    status: "in-review",
    preconditions: [
      "Seis horários: três limpos, um sem profissional, um sem sala e um sem os dois.",
    ],
    expected: [
      "O resumo aparece antes da grade, com as duas famílias de perda contadas separadamente.",
      "Cada conflito diz o que é e de quem é resolver.",
      "Aplicar continua disponível — é assim no sistema real, e a decisão precisa ser informada, não bloqueada.",
    ],
    tags: ["lista", "decisão"],
  },
  {
    id: "hour-map.no-agenda-is-not-a-clash",
    title: "Sem agenda não é horário ocupado",
    intent:
      "Separar cadastro faltando de disputa de horário — as duas viram “profissional indisponível” e pedem ações opostas.",
    route: "/patients/pac-theo/hour-map",
    persona: "coordinator",
    fixture: "hour-map-with-conflicts",
    rules: ["no-agenda-is-not-a-clash"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Sexta-feira sem agenda padrão cadastrada para a profissional."],
    expected: [
      "A mensagem diz que é cadastro faltando, e não horário ocupado.",
      "O responsável apontado é People, que define agenda padrão — e não a coordenação.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "hour-map.loses-both",
    title: "Horário que perde profissional e sala",
    intent:
      "Mostrar o caso em que um aviso único de “conflito” mais engana: duas perdas, dois donos, um agendamento criado assim mesmo.",
    route: "/patients/pac-theo/hour-map",
    persona: "coordinator",
    fixture: "hour-map-with-conflicts",
    rules: ["conflict-family-decides-what-is-lost", "hour-map-generates-with-holes"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Profissional em bloqueio de agenda e sala bloqueada no mesmo horário."],
    expected: [
      "Os dois conflitos aparecem listados, cada um com o seu responsável.",
      "A tela afirma que o horário vira agendamento mesmo assim.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "hour-map.clean",
    title: "Mapa sem conflito",
    intent: "Definir o caso raro em que tudo tem profissional e sala, para servir de referência.",
    route: "/patients/pac-theo/hour-map",
    persona: "coordinator",
    fixture: "hour-map-clean",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "Nenhum aviso de horário incompleto aparece.",
      "Aplicar está disponível.",
      "As horas por semana são somadas e exibidas.",
    ],
    tags: ["sucesso"],
  },
  {
    id: "hour-map.applied",
    title: "Mapa já aplicado",
    intent:
      "Impedir que o desenho seja editado depois de virar agendamento — a grade divergiria do que aconteceu.",
    route: "/patients/pac-theo/hour-map",
    persona: "coordinator",
    fixture: "hour-map-applied",
    rules: ["applied-map-is-not-redrawn"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "Editar aparece indisponível, explicando que agendamentos já existem.",
      "Aplicar aparece indisponível, dizendo que já foi aplicado.",
      "Os avisos gerados na aplicação ficam visíveis.",
      "O aviso de horários incompletos muda de tom: agora é um fato, não um risco.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "hour-map.empty",
    title: "Mapa em branco",
    intent: "Definir o começo, e explicar o que é um mapa de horas para quem nunca montou um.",
    route: "/patients/pac-theo/hour-map",
    persona: "coordinator",
    fixture: "hour-map-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela explica o que o mapa é: dia, horário, especialidade e, quando dá, profissional e sala.",
    ],
    tags: ["vazio"],
  },
];
