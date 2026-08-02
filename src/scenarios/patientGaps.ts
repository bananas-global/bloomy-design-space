import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários das pendências de cadastro.
 *
 * O módulo existe por causa de uma assimetria: `PatientFilters` sabe responder
 * "quem está sem plano, sem unidade, sem mapa de horas ou sem nível de suporte",
 * e nenhuma tela faz a pergunta. A consulta existe; a lista de trabalho, não.
 */
export const patientGapScenarios: Scenario[] = [
  {
    id: "patients.gaps-by-consequence",
    title: "Seis pendências, ordenadas pela consequência",
    intent:
      "Trocar “cadastro incompleto” por quatro ausências com dono e efeito próprios — a ordem por nome trata as quatro como iguais.",
    route: "/patients/gaps",
    persona: "coordinator",
    fixture: "patient-gaps-mixed",
    rules: ["the-filter-exists-and-the-worklist-does-not", "the-four-gaps-have-different-weights"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada paciente é um `article` com título de nível 3. A lacuna mais grave tem cor e vem primeira na lista — nunca só a cor.",
    },
    status: "in-review",
    preconditions: [
      "`PatientFilters` aceita `missing=plan|unit|hour_map|support_level` e `missing_any=true` — os nomes ficam aqui, e não na frase que a pessoa lê.",
      "Seis pacientes com combinações diferentes das quatro ausências.",
    ],
    expected: [
      "A lista abre pela lacuna clínica — nível de suporte — e não por nome.",
      "Cada lacuna diz o efeito dela e de quem é resolver.",
      "O tempo em atendimento aparece junto: duas semanas e dez meses não são a mesma coisa.",
    ],
    tags: ["lista", "regra", "decisão"],
  },
  {
    id: "patients.gaps-block-nothing",
    title: "Nada disso impede atendimento",
    intent:
      "Declarar o que torna estas ausências caras: elas não incomodam ninguém até alguém precisar do dado.",
    route: "/patients/gaps",
    persona: "clinic_admin",
    fixture: "patient-gaps-mixed",
    rules: ["these-gaps-block-nothing"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: ["Nenhum dos quatro filtros participa de qualquer verificação de agendamento."],
    expected: [
      "A tela afirma que o paciente é atendido normalmente com as quatro em aberto.",
      "E explica por que isso as torna caras, em vez de tranquilizar.",
      "O total ganha proporção sobre os pacientes ativos.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "patients.gaps-clinical",
    title: "A lacuna que não é administrativa",
    intent:
      "Separar o nível de suporte das outras três: é o dado que dimensiona a intensidade da intervenção.",
    route: "/patients/gaps",
    persona: "specialist",
    fixture: "patient-gaps-clinical-only",
    rules: ["the-four-gaps-have-different-weights"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    preconditions: [
      "O nível de suporte vive no perfil TEA do resumo clínico, como inteiro de 1 a 3.",
      "Uma das pacientes está há mais de um ano em atendimento sem ele.",
    ],
    expected: [
      "A tela nomeia o efeito clínico, e não “campo em branco”.",
      "Quem está há mais tempo aparece primeiro dentro da mesma lacuna.",
      "O dono é o especialista, na avaliação — não a recepção.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "patients.gaps-none",
    title: "Nenhuma pendência de cadastro",
    intent:
      "Definir o vazio sem transformá-lo em elogio: vale conferir justamente porque nada bloqueia.",
    route: "/patients/gaps",
    persona: "coordinator",
    fixture: "patient-gaps-none",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela diz quantos pacientes ativos foram conferidos.",
      "E lembra que nenhuma das quatro ausências bloqueia atendimento.",
    ],
    tags: ["vazio"],
  },
];
