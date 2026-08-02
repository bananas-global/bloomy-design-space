import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do funil de visitas.
 *
 * O único lugar do produto em que alguém ainda não é paciente — e por isso o
 * único em que quase nada é obrigatório. A consequência dessa folga aparece no
 * fim: converter exige um conjunto de dados que a visita nunca coletou.
 */
export const prospectScenarios: Scenario[] = [
  {
    id: "prospects.funnel",
    title: "O funil de julho",
    intent:
      "Fazer o funil responder onde o processo perde gente — que é a única coisa que lê-lo serve para descobrir.",
    route: "/prospects",
    persona: "attendant",
    fixture: "prospects-funnel",
    rules: ["lost-is-a-side-exit-not-the-last-step", "step-history-explains-the-funnel"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada contato é um artigo com heading próprio. Tempo parado e passo têm rótulo textual, não só posição.",
    },
    status: "in-review",
    preconditions: [
      "Seis famílias, duas perdidas em passos diferentes e uma parada há dois meses.",
    ],
    expected: [
      "As perdas aparecem agrupadas pelo passo em que aconteceram, e não como último estágio.",
      "Cada contato mostra há quantos dias está no passo atual.",
      "Os perdidos continuam registrados, com o motivo.",
    ],
    tags: ["lista", "regra"],
  },
  {
    id: "prospects.stalled",
    title: "Parado há dois meses",
    intent:
      "Distinguir quem está parado de quem acabou de chegar — numa lista por estágio, os dois são idênticos.",
    route: "/prospects",
    persona: "attendant",
    fixture: "prospects-stalled",
    rules: ["step-history-explains-the-funnel"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Aguardando plano desde 20 de maio."],
    expected: [
      "O aviso do topo nomeia quem está parado há mais de 30 dias.",
      "O tempo parado aparece junto do passo, e não numa coluna separada.",
      "O número é destacado quando passa de 30 dias.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "prospects.conversion-needs-more",
    title: "A conversão pede o que a visita não coleta",
    intent:
      "Dizer antes quais cinco dados vão faltar — para ninguém descobrir com a família na frente.",
    route: "/prospects",
    persona: "attendant",
    fixture: "prospects-ready-to-convert",
    rules: ["conversion-needs-more-than-the-visit-collected"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "`ConvertToPatientParams` exige data de nascimento e sexo da criança, e data de nascimento, estado civil e relação do responsável.",
      "`Prospects.LegalGuardian` guarda apenas nome, CPF, e-mail e telefone.",
    ],
    expected: [
      "Os cinco campos são listados por extenso, antes de tentar converter.",
      "A tela diz que são sempre os mesmos, e que vale coletar na visita.",
      "Converter aparece indisponível, com a contagem do que falta.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "prospects.no-availability",
    title: "Sem disponibilidade declarada",
    intent:
      "Impedir que um contato avance no funil e trave na hora de marcar — a janela é barata na visita e cara depois.",
    route: "/prospects",
    persona: "attendant",
    fixture: "prospects-no-availability",
    rules: ["availability-is-what-makes-the-first-schedule-possible"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "A ausência de janela aparece destacada no cartão.",
      "Marcar primeira sessão fica indisponível, explicando o custo de perseguir depois.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "prospects.empty",
    title: "Nenhuma visita registrada",
    intent: "Definir o vazio, explicando o que entra nesta tela.",
    route: "/prospects",
    persona: "attendant",
    fixture: "prospects-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela explica que ali ficam as famílias que ainda não viraram paciente.",
    ],
    tags: ["vazio"],
  },
];
