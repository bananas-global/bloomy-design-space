import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários da equipe.
 *
 * O módulo que explica os outros. Dois cenários existem só para tornar visível
 * um elo: a assinatura do supervisor que o Atendimento exige nasce aqui, e a
 * nota fiscal que o Fechamento pede também.
 */
export const teamScenarios: Scenario[] = [
  {
    id: "team.roster",
    title: "Equipe da unidade",
    intent:
      "Tornar legível quem trabalha na clínica, com que vínculo e sob qual supervisão — e o que cada cadastro decide longe daqui.",
    route: "/team",
    persona: "people",
    fixture: "team-roster",
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "Cada profissional é um artigo com heading próprio. Contrato e supervisão são seções com heading de nível 3.",
    },
    status: "ported",
    preconditions: ["Quatro profissionais e um espaço reservado, com contratos dos dois tipos."],
    expected: [
      "Cada profissional mostra especialidade, registro de conselho e situação.",
      "Quem está em supervisão aparece marcado, com o nome de quem supervisiona.",
      "Cadastro incompleto aparece com os campos que faltam nomeados.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "team.supervision-defines-signature",
    title: "A supervisão define a segunda assinatura",
    intent:
      "Mostrar onde mora uma configuração que o módulo de Atendimento consome — e que quem desenha aquela tela procura no lugar errado.",
    route: "/team",
    persona: "coordinator",
    fixture: "team-supervised",
    rules: ["supervision-link-defines-second-signature", "one-supervision-link-per-pair"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`need_supervisor_signature` é campo de `Professionals.Internship`, e não do agendamento.",
    ],
    expected: [
      "O vínculo diz explicitamente que exige assinatura nas sessões.",
      "A seção “o que este cadastro decide” liga o vínculo à exigência no atendimento.",
      "O nome de quem vai assinar aparece, e não só que há supervisão.",
    ],
    tags: ["regra", "decisão"],
  },
  {
    id: "team.tbd",
    title: "Profissional a definir",
    intent:
      "Preservar um conceito fácil de perder no porte: o espaço reservado na agenda, criado antes de saber quem atende.",
    route: "/team",
    persona: "people",
    fixture: "team-tbd",
    rules: ["tbd-professional-is-a-placeholder"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["`@tbd_required_fields` tem dois campos; `@full_required_fields` tem dez."],
    expected: [
      "O cadastro aparece marcado como a definir.",
      "A tela explica que só nome e especialidade são exigidos, e por quê.",
      "Nenhum aviso de cadastro incompleto aparece: ele não está incompleto, é outro tipo de cadastro.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "team.incomplete",
    title: "Cadastro comum incompleto",
    intent: "Contrastar com o a definir: os mesmos dois campos, e mais oito exigidos.",
    route: "/team",
    persona: "people",
    fixture: "team-incomplete",
    rules: ["tbd-professional-is-a-placeholder"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "O aviso conta quantos campos faltam e os nomeia.",
      "A diferença com o cadastro a definir fica evidente ao abrir os dois.",
    ],
    tags: ["exceção"],
  },
  {
    id: "team.contract-incomplete",
    title: "Contrato por hora com taxa faltando",
    intent:
      "Impedir um contrato que produz fechamento errado — descoberto pelo profissional, no aceite.",
    route: "/team",
    persona: "people",
    fixture: "team-contract-incomplete",
    rules: ["contract-type-decides-required-rates"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "Remuneração por hora exige as três taxas maiores que zero. Falta a hora administrativa especial.",
    ],
    expected: [
      "O aviso nomeia a taxa que falta.",
      "A tela explica a consequência: fechamento errado, descoberto no aceite.",
      "O valor ausente aparece marcado como não informado na lista.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "team.fixed-contract-allows-zero",
    title: "Hora administrativa zerada é válida em contrato fixo",
    intent:
      "Tornar visível uma assimetria real: o mesmo campo é obrigatório num tipo de contrato e pode ser zero no outro.",
    route: "/team",
    persona: "people",
    fixture: "team-roster",
    rules: ["contract-type-decides-required-rates"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`validate_by_type` passa `allow_zero?` verdadeiro só para a hora administrativa em remuneração fixa.",
    ],
    expected: [
      "O contrato fixo com hora administrativa zerada não gera aviso.",
      "A tela explica por que zero é válido ali: quem tem mensalidade não cobra hora à parte.",
    ],
    tags: ["regra", "exceção"],
  },
  {
    id: "team.no-invoice-contract",
    title: "O contrato decide a nota fiscal do fechamento",
    intent:
      "Fechar o elo com o módulo de Fechamentos: a variante curta daquele ciclo é decidida aqui.",
    route: "/team",
    persona: "people",
    fixture: "team-no-invoice-contract",
    rules: ["contract-decides-invoice-requirement"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: ["`issue_invoice` do contrato ativo é falso."],
    expected: [
      "A seção “o que este cadastro decide” diz que o fechamento pula as etapas de nota.",
      "A afirmação é sobre o fechamento, e não sobre o cadastro — é o elo que se quer visível.",
    ],
    tags: ["regra"],
  },
  {
    id: "team.deactivation-without-date",
    title: "Desativar sem data",
    intent:
      "Impedir que agendamentos futuros de quem saiu continuem parecendo legítimos.",
    route: "/team",
    persona: "people",
    fixture: "team-deactivation-without-date",
    rules: ["deactivation-needs-a-date"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: [
      "Desativar aparece indisponível, pedindo a data.",
      "O motivo explica o que a data separa, e não apenas que é obrigatória.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "team.no-access",
    title: "Quem atende não vê a equipe",
    intent: "Definir o que a terapeuta encontra ao abrir o link da lista de profissionais.",
    route: "/team",
    persona: "therapeutic_companion",
    fixture: "team-roster",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    preconditions: [
      "`ProfessionalPolicy.can?(role, :list)` é de admin, admin de clínica, recepção, coordenação e People.",
    ],
    expected: [
      "A tela nomeia quem alcança a lista.",
      "O bloqueio é de permissão, não de dado.",
    ],
    tags: ["permissão", "exceção"],
  },
  {
    id: "team.empty",
    title: "Unidade sem profissionais",
    intent: "Definir a unidade recém-aberta.",
    route: "/team",
    persona: "people",
    fixture: "team-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: ["A tela explica o que aparece aqui depois do primeiro vínculo."],
    tags: ["vazio"],
  },
];
